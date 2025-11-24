import { NextRequest, NextResponse } from 'next/server';
import { getUserById, updateUser, getPosts, savePosts } from '@/lib/storage';
import Stripe from 'stripe';
import { PlanType } from '@/types';

// Stripeインスタンスを遅延初期化
let stripe: Stripe | null = null;

function getStripeInstance(): Stripe | null {
  if (!stripe) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      return null;
    }
    try {
      stripe = new Stripe(secretKey, {
        apiVersion: '2024-11-20.acacia',
      });
    } catch (error) {
      console.error('Stripe initialization error:', error);
      return null;
    }
  }
  return stripe;
}

/**
 * サブスクリプションの期限が過ぎているかチェック
 * 期限が過ぎていて、cancelAtPeriodEndがtrueの場合、自動的に同期が必要
 * また、即時キャンセルの場合も同期が必要（Webhookが届かない場合に備える）
 */
function shouldAutoSync(user: any): boolean {
  if (!user.subscription) return false;
  
  const subscription = user.subscription;
  
  // 既にFreeプランの場合は同期不要
  if (subscription.planType === 'free') return false;
  
  // サブスクリプションIDがない場合は同期不可
  if (!subscription.stripeSubscriptionId) return false;
  
  // cancelAtPeriodEndがtrueで、currentPeriodEndが過去の日付の場合
  if (subscription.cancelAtPeriodEnd && subscription.currentPeriodEnd) {
    const periodEnd = new Date(subscription.currentPeriodEnd).getTime();
    const now = Date.now();
    
    // 期限が過ぎている場合（1分のマージンを設ける）
    if (periodEnd < now - 60000) {
      return true;
    }
  }
  
  // statusがcanceled, unpaid, past_dueの場合も同期が必要
  const invalidStatuses = ['canceled', 'unpaid', 'past_due', 'incomplete_expired'];
  if (subscription.status && invalidStatuses.includes(subscription.status)) {
    return true;
  }
  
  // 即時キャンセルの場合、データベースのstatusがまだ"active"のままの可能性がある
  // そのため、サブスクリプションIDがある場合は、定期的にStripeから最新の状態を取得する
  // ただし、過度なリクエストを避けるため、最後に同期した時刻をチェック
  // （ここでは簡易的に、statusが"active"でcancelAtPeriodEndがfalseの場合もチェック）
  // 実際の同期処理で、Stripeから最新の状態を取得して判定する
  
  return false;
}

/**
 * サブスクリプションを自動同期（期限切れを検知した場合）
 */
async function autoSyncSubscription(userId: string, subscriptionId: string): Promise<void> {
  try {
    const stripeInstance = getStripeInstance();
    if (!stripeInstance) {
      console.log('AutoSync: Stripeインスタンスが取得できません（スキップ）');
      return;
    }

    let subscription: Stripe.Subscription;
    try {
      subscription = await stripeInstance.subscriptions.retrieve(subscriptionId);
    } catch (error: any) {
      // サブスクリプションが削除されている場合（即時キャンセルなど）
      if (error.type === 'StripeInvalidRequestError' && error.code === 'resource_missing') {
        console.log('AutoSync: サブスクリプションが削除されています - Freeプランに戻す', {
          userId,
          subscriptionId,
        });
        
        // Freeプランに戻す
        const user = await getUserById(userId);
        if (!user) return;

        await updateUser(userId, {
          subscription: {
            ...user.subscription,
            planType: 'free',
            status: 'canceled',
          },
        });

        // 投稿の優先表示フラグを無効化
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

        console.log('AutoSync: Freeプランへの切り替え完了（サブスクリプション削除）');
        return;
      }
      // その他のエラーは再スロー
      throw error;
    }
    
    // 価格IDからplanTypeを取得
    const priceId = subscription.items.data[0]?.price?.id;
    const growPriceId = process.env.STRIPE_PRICE_ID_GROW;
    const bloomPriceId = process.env.STRIPE_PRICE_ID_BLOOM;

    let planType: PlanType = 'free';
    if (priceId) {
      if (growPriceId && priceId === growPriceId) {
        planType = 'grow';
      } else if (bloomPriceId && priceId === bloomPriceId) {
        planType = 'bloom';
      }
    }

    // サブスクリプションの状態を確認
    const invalidStatuses = ['canceled', 'unpaid', 'past_due', 'incomplete_expired'];
    const isInvalidStatus = invalidStatuses.includes(subscription.status);
    const now = Math.floor(Date.now() / 1000);
    const periodEnded = subscription.cancel_at_period_end &&
                       subscription.current_period_end &&
                       subscription.current_period_end < now;

    // 無効な状態または期間終了済みの場合はFreeプランに戻す
    if (isInvalidStatus || periodEnded) {
      planType = 'free';
    }

    const isActive = subscription.status === 'active' && !periodEnded;

    // ユーザー情報を更新
    const user = await getUserById(userId);
    if (!user) return;

    await updateUser(userId, {
      subscription: {
        ...user.subscription,
        stripeCustomerId: subscription.customer as string,
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

    console.log('AutoSync: 同期完了', {
      userId,
      planType,
      status: subscription.status,
    });
  } catch (error: any) {
    // エラーは無視（ログのみ）
    console.log('AutoSync: 同期エラー（無視）', error.message);
  }
}

export async function GET(request: NextRequest) {
  try {
    const userId = request.cookies.get('userId')?.value;

    // 未ログインの場合は200を返してuser: nullを返す（ブラウザのコンソールエラーを避けるため）
    if (!userId) {
      return NextResponse.json(
        { user: null },
        { status: 200 }
      );
    }

    const user = await getUserById(userId);

    if (!user) {
      return NextResponse.json(
        { user: null },
        { status: 200 }
      );
    }

    // 利用停止チェック
    if (user.isActive === false) {
      return NextResponse.json(
        { error: 'このアカウントは利用停止されています' },
        { status: 403 }
      );
    }

    // サブスクリプションの期限が過ぎている場合、自動的に同期を試みる
    // 非同期で実行（レスポンスをブロックしない）
    // 過度なリクエストを避けるため、最後に同期した時刻をチェック（10分に1回程度）
    const lastSyncKey = `lastSync:${user.id}`;
    const lastSyncTime = (global as any)[lastSyncKey] || 0;
    const now = Date.now();
    const syncInterval = 10 * 60 * 1000; // 10分間隔
    
    if (shouldAutoSync(user) && user.subscription?.stripeSubscriptionId) {
      // 期限切れや無効なステータスの場合は、最後の同期から10分経過していれば同期
      if (now - lastSyncTime > syncInterval) {
        (global as any)[lastSyncKey] = now;
        // バックグラウンドで同期を実行（エラーは無視）
        autoSyncSubscription(user.id, user.subscription.stripeSubscriptionId).catch(err => {
          console.log('AutoSync: 同期エラー（無視）', err.message);
        });
        
        console.log('AutoSync: 期限切れまたは無効なステータスを検知、バックグラウンドで同期を開始', {
          userId: user.id,
          planType: user.subscription?.planType,
          status: user.subscription?.status,
          currentPeriodEnd: user.subscription?.currentPeriodEnd,
          cancelAtPeriodEnd: user.subscription?.cancelAtPeriodEnd,
        });
      }
    } else if (user.subscription?.stripeSubscriptionId && user.subscription?.planType !== 'free') {
      // 即時キャンセルの場合、データベースのstatusがまだ"active"のままの可能性がある
      // そのため、サブスクリプションIDがある場合は、定期的にStripeから最新の状態を取得する
      // ただし、過度なリクエストを避けるため、最後に同期した時刻をチェック（10分に1回程度）
      if (now - lastSyncTime > syncInterval) {
        (global as any)[lastSyncKey] = now;
        // より積極的な同期: statusが"active"の場合でも、Stripeから最新の状態を取得
        // ただし、レスポンス時間への影響を最小限にするため、非同期で実行
        autoSyncSubscription(user.id, user.subscription.stripeSubscriptionId).catch(err => {
          // エラーは無視（Stripe APIが利用できない場合など）
          console.log('AutoSync: 定期チェックで同期エラー（無視）', err.message);
        });
        
        console.log('AutoSync: 定期チェック - サブスクリプション状態を確認', {
          userId: user.id,
          planType: user.subscription?.planType,
          status: user.subscription?.status,
        });
      }
    }

    // デバッグ用ログ（開発環境のみ、機密情報は含めない）
    if (process.env.NODE_ENV === 'development') {
      console.log('GET /api/auth/me:', {
        userId: user.id.substring(0, 8) + '...', // ユーザーIDの一部のみ表示
        planType: user.subscription?.planType,
        status: user.subscription?.status,
        shouldAutoSync: shouldAutoSync(user),
      });
    }

    return NextResponse.json({ user }, { status: 200 });
  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json(
      { error: 'ユーザー情報の取得に失敗しました' },
      { status: 500 }
    );
  }
}

