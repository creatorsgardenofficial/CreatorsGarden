import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getUserById, updateUser, getUserByEmail, getPosts, savePosts } from '@/lib/storage';
import { PlanType } from '@/types';

// Stripe APIバージョン（最新の安定版を使用）
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

// 環境変数の検証
if (!process.env.STRIPE_SECRET_KEY) {
  console.warn('警告: STRIPE_SECRET_KEYが設定されていません。Stripe機能は動作しません。');
}
if (!webhookSecret) {
  console.warn('警告: STRIPE_WEBHOOK_SECRETが設定されていません。Webhook検証ができません。');
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      console.error('Webhook: 署名がありません');
      return NextResponse.json(
        { error: '署名がありません' },
        { status: 400 }
      );
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
      console.log('Webhook: イベント受信:', event.type);
    } catch (err: any) {
      console.error('Webhook: 署名検証失敗:', err.message);
      return NextResponse.json(
        { error: `Webhookエラー: ${err.message}` },
        { status: 400 }
      );
    }

    // イベントタイプに応じて処理
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        // 開発環境のみログ出力（機密情報を含む）
        if (process.env.NODE_ENV === 'development') {
          console.log('Webhook: checkout.session.completed', {
            sessionId: session.id.substring(0, 8) + '...',
            mode: session.mode,
            customerId: typeof session.customer === 'string' ? session.customer.substring(0, 8) + '...' : session.customer,
            userId: session.metadata?.userId ? session.metadata.userId.substring(0, 8) + '...' : undefined,
            planType: session.metadata?.planType,
          });
        }
        
        if (session.mode === 'subscription') {
          const subscriptionId = session.subscription as string;
          const customerId = session.customer as string;
          const userId = session.metadata?.userId;
          const metadataPlanType = session.metadata?.planType as PlanType;

          if (userId && metadataPlanType) {
            // 開発環境のみログ出力
            if (process.env.NODE_ENV === 'development') {
              console.log('Webhook: ユーザー情報を更新開始', { 
                userId: userId.substring(0, 8) + '...', 
                metadataPlanType 
              });
            }
            const user = await getUserById(userId);
            if (user) {
              // 開発環境のみログ出力
              if (process.env.NODE_ENV === 'development') {
                console.log('Webhook: ユーザー情報取得成功', { 
                  userId: user.id, 
                  currentPlan: user.subscription?.planType 
                });
              }
              
              const subscription = await stripe.subscriptions.retrieve(subscriptionId);
              if (process.env.NODE_ENV === 'development') {
                console.log('Webhook: サブスクリプション情報取得', {
                  subscriptionId,
                  status: subscription.status,
                });
              }
              
              // 価格IDからplanTypeを取得して検証
              const priceId = subscription.items.data[0]?.price?.id;
              let planType: PlanType = metadataPlanType;
              
              if (priceId) {
                const growPriceId = process.env.STRIPE_PRICE_ID_GROW;
                const bloomPriceId = process.env.STRIPE_PRICE_ID_BLOOM; // オプション（Bloom Plan準備中）
                
                if (growPriceId && priceId === growPriceId) {
                  planType = 'grow';
                } else if (bloomPriceId && priceId === bloomPriceId) {
                  planType = 'bloom';
                }
                
                // メタデータと価格IDから取得したplanTypeが一致しない場合は警告
                if (planType !== metadataPlanType) {
                  console.warn('Webhook: メタデータと価格IDのplanTypeが一致しません', {
                    metadataPlanType,
                    priceIdPlanType: planType,
                    priceId,
                    using: planType,
                  });
                }
              } else {
                console.warn('Webhook: 価格IDが取得できません。メタデータのplanTypeを使用します', {
                  subscriptionId,
                  metadataPlanType,
                });
              }
              
              const updatedUser = await updateUser(userId, {
                subscription: {
                  stripeCustomerId: customerId,
                  stripeSubscriptionId: subscriptionId,
                  planType: planType,
                  status: subscription.status as any,
                  currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
                  cancelAtPeriodEnd: subscription.cancel_at_period_end,
                },
              });
              
              console.log('Webhook: ユーザー情報更新完了', {
                userId: updatedUser?.id,
                planType: updatedUser?.subscription?.planType,
                status: updatedUser?.subscription?.status,
              });
              
              // プラン変更に伴い、既存の投稿の優先表示フラグを更新
              const isActive = subscription.status === 'active';
              const shouldHavePriority = (planType === 'grow' || planType === 'bloom') && isActive;
              
              console.log('Webhook: 投稿の優先表示フラグを更新', {
                shouldHavePriority,
                isActive,
                planType,
              });
              
              const posts = await getPosts();
              let updated = false;
              for (let i = 0; i < posts.length; i++) {
                if (posts[i].userId === userId) {
                  posts[i].priorityDisplay = shouldHavePriority;
                  posts[i].featuredDisplay = shouldHavePriority;
                  posts[i].updatedAt = new Date().toISOString();
                  updated = true;
                }
              }
              if (updated) {
                await savePosts(posts);
                console.log('Webhook: 投稿の優先表示フラグ更新完了');
              }
            } else {
              console.error('Webhook: ユーザーが見つかりません', { userId });
            }
          } else {
            console.error('Webhook: メタデータが不足しています', { userId, metadataPlanType });
          }
        }
        break;
      }
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        console.log('Webhook: subscription event', {
          type: event.type,
          customerId,
          subscriptionId: subscription.id,
          status: subscription.status,
        });

        // メタデータからユーザーIDを取得
        const customer = await stripe.customers.retrieve(customerId);
        if (!customer.deleted && 'metadata' in customer) {
          const userId = customer.metadata?.userId;
          console.log('Webhook: 顧客情報取得', { userId, customerId });
          
          if (userId) {
            const user = await getUserById(userId);
            if (user) {
              console.log('Webhook: ユーザー情報取得', {
                userId: user.id,
                currentPlan: user.subscription?.planType,
              });
              
              if (event.type === 'customer.subscription.deleted') {
                // サブスクリプションが削除された場合、無料プランに戻す
                console.log('Webhook: サブスクリプション削除 - Free Planに戻す');
                await updateUser(userId, {
                  subscription: {
                    stripeCustomerId: customerId,
                    planType: 'free',
                    status: 'canceled',
                  },
                });
                
                // 既存の投稿の優先表示フラグを無効化
                const posts = await getPosts();
                let updated = false;
                for (let i = 0; i < posts.length; i++) {
                  if (posts[i].userId === userId) {
                    posts[i].priorityDisplay = false;
                    posts[i].featuredDisplay = false;
                    posts[i].updatedAt = new Date().toISOString();
                    updated = true;
                  }
                }
                if (updated) {
                  await savePosts(posts);
                }
              } else {
                // サブスクリプションが更新された場合
                // サブスクリプションがキャンセル済みまたは無効な状態の場合、Freeプランに戻す
                const invalidStatuses = ['canceled', 'unpaid', 'past_due', 'incomplete_expired'];
                const isInvalidStatus = invalidStatuses.includes(subscription.status);
                
                // 期間終了チェック: cancel_at_period_end が true で、current_period_end が過去の日付の場合
                const now = Math.floor(Date.now() / 1000);
                const periodEnded = subscription.cancel_at_period_end && 
                                   subscription.current_period_end && 
                                   subscription.current_period_end < now;
                
                if (isInvalidStatus || periodEnded) {
                  // サブスクリプションが無効な状態、または期間終了済みの場合、Freeプランに戻す
                  console.log('Webhook: サブスクリプションが無効な状態または期間終了 - Free Planに戻す', {
                    status: subscription.status,
                    subscriptionId: subscription.id,
                    cancelAtPeriodEnd: subscription.cancel_at_period_end,
                    currentPeriodEnd: subscription.current_period_end,
                    periodEnded,
                    isInvalidStatus,
                  });
                  
                  await updateUser(userId, {
                    subscription: {
                      ...user.subscription,
                      stripeCustomerId: customerId,
                      stripeSubscriptionId: subscription.id,
                      planType: 'free',
                      status: subscription.status as any,
                      currentPeriodEnd: subscription.current_period_end 
                        ? new Date(subscription.current_period_end * 1000).toISOString()
                        : undefined,
                      cancelAtPeriodEnd: subscription.cancel_at_period_end,
                    },
                  });
                  
                  // 既存の投稿の優先表示フラグを無効化
                  const posts = await getPosts();
                  let updated = false;
                  for (let i = 0; i < posts.length; i++) {
                    if (posts[i].userId === userId) {
                      posts[i].priorityDisplay = false;
                      posts[i].featuredDisplay = false;
                      posts[i].updatedAt = new Date().toISOString();
                      updated = true;
                    }
                  }
                  if (updated) {
                    await savePosts(posts);
                  }
                  
                  console.log('Webhook: Free Planへの切り替え完了');
                } else {
                  // サブスクリプションが有効な場合、Stripeの価格IDからplanTypeを取得
                  const priceId = subscription.items.data[0]?.price?.id;
                  let planType: PlanType = 'free';
                  
                  if (priceId) {
                    // 環境変数から価格IDを取得して比較
                    const growPriceId = process.env.STRIPE_PRICE_ID_GROW;
                    const bloomPriceId = process.env.STRIPE_PRICE_ID_BLOOM;
                    
                    if (priceId === growPriceId) {
                      planType = 'grow';
                    } else if (priceId === bloomPriceId) {
                      planType = 'bloom';
                    } else {
                      // 価格IDが一致しない場合、既存のplanTypeを保持（フォールバック）
                      planType = user.subscription?.planType || 'free';
                      console.warn('Webhook: 価格IDが一致しません', {
                        priceId,
                        growPriceId,
                        bloomPriceId,
                        fallbackPlanType: planType,
                      });
                    }
                  } else {
                    // 価格IDが取得できない場合、既存のplanTypeを保持
                    planType = user.subscription?.planType || 'free';
                    console.warn('Webhook: 価格IDが取得できません', {
                      subscriptionId: subscription.id,
                      fallbackPlanType: planType,
                    });
                  }
                  
                  const isActive = subscription.status === 'active';
                  
                  console.log('Webhook: サブスクリプション更新', {
                    priceId,
                    planType,
                    isActive,
                    subscriptionStatus: subscription.status,
                    previousPlanType: user.subscription?.planType,
                  });
                  
                  await updateUser(userId, {
                    subscription: {
                      ...user.subscription,
                      stripeCustomerId: customerId,
                      stripeSubscriptionId: subscription.id,
                      planType: planType,
                      status: subscription.status as any,
                      currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
                      cancelAtPeriodEnd: subscription.cancel_at_period_end,
                    },
                  });
                  
                  console.log('Webhook: ユーザー情報更新完了');
                  
                  // プラン変更に伴い、既存の投稿の優先表示フラグを更新
                  const shouldHavePriority = (planType === 'grow' || planType === 'bloom') && isActive;
                  
                  const posts = await getPosts();
                  let updated = false;
                  for (let i = 0; i < posts.length; i++) {
                    if (posts[i].userId === userId) {
                      posts[i].priorityDisplay = shouldHavePriority;
                      posts[i].featuredDisplay = shouldHavePriority;
                      posts[i].updatedAt = new Date().toISOString();
                      updated = true;
                    }
                  }
                  if (updated) {
                    await savePosts(posts);
                  }
                }
              }
            } else {
              console.error('Webhook: ユーザーが見つかりません', { userId });
            }
          } else {
            console.error('Webhook: 顧客メタデータにuserIdがありません', { customerId });
          }
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        console.log('Webhook: invoice.payment_succeeded', { customerId });
        
        const customer = await stripe.customers.retrieve(customerId);
        if (!customer.deleted && 'metadata' in customer) {
          const userId = customer.metadata?.userId;
          if (userId) {
            const user = await getUserById(userId);
            if (user && invoice.subscription) {
              const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
              
              // サブスクリプションの状態を確認
              const invalidStatuses = ['canceled', 'unpaid', 'past_due', 'incomplete_expired'];
              const isInvalidStatus = invalidStatuses.includes(subscription.status);
              const now = Math.floor(Date.now() / 1000);
              const periodEnded = subscription.cancel_at_period_end && 
                                 subscription.current_period_end && 
                                 subscription.current_period_end < now;
              
              // 無効な状態または期間終了済みの場合はFreeプランに戻す
              const planType = (isInvalidStatus || periodEnded) ? 'free' : user.subscription?.planType || 'free';
              const isActive = subscription.status === 'active' && !periodEnded;
              
              await updateUser(userId, {
                subscription: {
                  ...user.subscription,
                  planType: planType,
                  status: subscription.status as any,
                  currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
                  cancelAtPeriodEnd: subscription.cancel_at_period_end,
                },
              });
              
              // プラン変更に伴い、既存の投稿の優先表示フラグを更新
              const shouldHavePriority = (planType === 'grow' || planType === 'bloom') && isActive;
              const posts = await getPosts();
              let updated = false;
              for (let i = 0; i < posts.length; i++) {
                if (posts[i].userId === userId) {
                  posts[i].priorityDisplay = shouldHavePriority;
                  posts[i].featuredDisplay = shouldHavePriority;
                  posts[i].updatedAt = new Date().toISOString();
                  updated = true;
                }
              }
              if (updated) {
                await savePosts(posts);
              }
              
              console.log('Webhook: 請求書支払い成功 - ユーザー情報更新完了', {
                planType,
                isActive,
                periodEnded,
              });
            }
          }
        }
        break;
      }

      default:
        console.warn(`Webhook: 未処理のイベントタイプ ${event.type}`);
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error: any) {
    console.error('Webhook: エラー発生', error);
    return NextResponse.json(
      { error: error.message || 'Webhook処理に失敗しました' },
      { status: 500 }
    );
  }
}
