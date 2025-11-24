import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getUserById, updateUser, getPosts, savePosts } from '@/lib/storage';
import { PlanType } from '@/types';

// Stripeインスタンスを遅延初期化
let stripe: Stripe | null = null;

function getStripeInstance(): Stripe {
  if (!stripe) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY is not set');
    }
    stripe = new Stripe(secretKey, {
      apiVersion: '2023-10-16',
    });
  }
  return stripe;
}

/**
 * Stripe APIから直接サブスクリプション情報を取得して、データベースを同期する
 * Webhookが届かない場合でも、手動で同期できます
 */
export async function POST(request: NextRequest) {
  try {
    const userId = request.cookies.get('userId')?.value;

    if (!userId) {
      return NextResponse.json(
        { error: 'ログインが必要です' },
        { status: 401 }
      );
    }

    const user = await getUserById(userId);
    if (!user) {
      return NextResponse.json(
        { error: 'ユーザーが見つかりません' },
        { status: 404 }
      );
    }

    // サブスクリプションIDがない場合は同期不要
    if (!user.subscription?.stripeSubscriptionId) {
      return NextResponse.json({
        success: true,
        message: 'サブスクリプションがありません',
        planType: user.subscription?.planType || 'free',
      });
    }

    const subscriptionId = user.subscription.stripeSubscriptionId;
    console.log('SyncSubscription: サブスクリプションを同期開始', {
      userId,
      subscriptionId,
    });

    // Stripe APIからサブスクリプション情報を取得
    const stripeInstance = getStripeInstance();
    const subscription = await stripeInstance.subscriptions.retrieve(subscriptionId);

    console.log('SyncSubscription: サブスクリプション情報取得', {
      subscriptionId,
      status: subscription.status,
      cancel_at_period_end: subscription.cancel_at_period_end,
    });

    // 価格IDからplanTypeを取得
    const priceId = subscription.items.data[0]?.price?.id;
    const growPriceId = process.env.STRIPE_PRICE_ID_GROW;
    const bloomPriceId = process.env.STRIPE_PRICE_ID_BLOOM; // オプション（Bloom Plan準備中）

    let planType: PlanType = 'free';
    if (priceId) {
      if (growPriceId && priceId === growPriceId) {
        planType = 'grow';
      } else if (bloomPriceId && priceId === bloomPriceId) {
        planType = 'bloom';
      } else {
        // 価格IDが一致しない場合、既存のplanTypeを保持（フォールバック）
        planType = user.subscription?.planType || 'free';
        console.warn('SyncSubscription: 価格IDが一致しません', {
          priceId,
          growPriceId,
          bloomPriceId: bloomPriceId || '未設定',
          fallbackPlanType: planType,
        });
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
      console.log('SyncSubscription: サブスクリプションが無効な状態または期間終了済み', {
        isInvalidStatus,
        periodEnded,
        status: subscription.status,
      });
    }

    const isActive = subscription.status === 'active' && !periodEnded;

    // ユーザー情報を更新
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

    console.log('SyncSubscription: ユーザー情報更新完了', {
      userId,
      planType,
      status: subscription.status,
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
      console.log('SyncSubscription: 投稿の優先表示フラグ更新完了');
    }

    return NextResponse.json({
      success: true,
      message: 'サブスクリプション情報を同期しました',
      planType,
      status: subscription.status,
      isActive,
      updated: planType !== (user.subscription?.planType || 'free'),
    }, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });

  } catch (error: any) {
    console.error('SyncSubscription: エラー', error);

    // Stripe APIエラーの場合
    if (error.type === 'StripeInvalidRequestError') {
      if (error.code === 'resource_missing') {
        // サブスクリプションが見つからない場合（削除済み）
        const userId = request.cookies.get('userId')?.value;
        if (userId) {
          const user = await getUserById(userId);
          if (user && user.subscription?.stripeSubscriptionId) {
            // Freeプランに戻す
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

            return NextResponse.json({
              success: true,
              message: 'サブスクリプションが見つかりませんでした。Freeプランに戻しました。',
              planType: 'free',
              status: 'canceled',
              isActive: false,
              updated: true,
            });
          }
        }
      }

      return NextResponse.json(
        { error: `Stripe APIエラー: ${error.message}` },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'サブスクリプションの同期に失敗しました' },
      { status: 500 }
    );
  }
}

