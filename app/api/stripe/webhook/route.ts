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
  }
if (!webhookSecret) {
  }

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      return NextResponse.json(
        { error: '署名がありません' },
        { status: 400 }
      );
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
      // 開発環境でのみログ出力
      if (process.env.NODE_ENV === 'development') {
        }
    } catch (err: any) {
      // 本番環境では詳細なエラー情報をログに出力しない
      if (process.env.NODE_ENV === 'development') {
        } else {
        }
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
          }
        
        if (session.mode === 'subscription') {
          const subscriptionId = session.subscription as string;
          const customerId = session.customer as string;
          const userId = session.metadata?.userId;
          const metadataPlanType = session.metadata?.planType as PlanType;

          if (userId && metadataPlanType) {
            // 開発環境のみログ出力
            if (process.env.NODE_ENV === 'development') {
              }
            const user = await getUserById(userId);
            if (user) {
              // 開発環境のみログ出力
              if (process.env.NODE_ENV === 'development') {
                }
              
              const subscription = await stripe.subscriptions.retrieve(subscriptionId);
              if (process.env.NODE_ENV === 'development') {
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
                  }
              } else {
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
              
              // プラン変更に伴い、既存の投稿の優先表示フラグを更新
              const isActive = subscription.status === 'active';
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
                // 開発環境でのみログ出力
                if (process.env.NODE_ENV === 'development') {
                  }
              }
            } else {
              // 本番環境では機密情報をログに出力しない
              if (process.env.NODE_ENV === 'development') {
                } else {
                }
            }
          } else {
            // 本番環境では機密情報をログに出力しない
            if (process.env.NODE_ENV === 'development') {
              } else {
              }
          }
        }
        break;
      }
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        // メタデータからユーザーIDを取得
        const customer = await stripe.customers.retrieve(customerId);
        if (!customer.deleted && 'metadata' in customer) {
          const userId = customer.metadata?.userId;
          if (userId) {
            const user = await getUserById(userId);
            if (user) {
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
                    }
                } else {
                  // 価格IDが取得できない場合、既存のplanTypeを保持
                  planType = user.subscription?.planType || 'free';
                  }
                
                const isActive = subscription.status === 'active';
                
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
            } else {
              // 本番環境では機密情報をログに出力しない
              if (process.env.NODE_ENV === 'development') {
                } else {
                }
            }
          } else {
            // 本番環境では機密情報をログに出力しない
            if (process.env.NODE_ENV === 'development') {
              } else {
              }
          }
        }
        break;
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        // メタデータからユーザーIDを取得
        const customer = await stripe.customers.retrieve(customerId);
        if (!customer.deleted && 'metadata' in customer) {
          const userId = customer.metadata?.userId;
          if (userId) {
            const user = await getUserById(userId);
            if (user) {
              // サブスクリプションが削除された場合、無料プランに戻す
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
              // 本番環境では機密情報をログに出力しない
              if (process.env.NODE_ENV === 'development') {
                } else {
                }
            }
          } else {
            // 本番環境では機密情報をログに出力しない
            if (process.env.NODE_ENV === 'development') {
              } else {
              }
          }
        }
        break;
      }
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        // 開発環境でのみログ出力（機密情報を含む）
        if (process.env.NODE_ENV === 'development') {
          }
        
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
              
              }
          }
        }
        break;
      }
      default:
        }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error: any) {
    // 本番環境では詳細なエラー情報をログに出力しない
    if (process.env.NODE_ENV === 'development') {
      } else {
      }
    return NextResponse.json(
      { error: 'Webhook処理に失敗しました' },
      { status: 500 }
    );
  }
}
