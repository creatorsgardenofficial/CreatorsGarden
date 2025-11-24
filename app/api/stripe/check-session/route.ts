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

export async function GET(request: NextRequest) {
  try {
    const sessionId = request.nextUrl.searchParams.get('session_id');
    
    if (!sessionId) {
      return NextResponse.json(
        { error: 'セッションIDが必要です' },
        { status: 400 }
      );
    }

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

    const stripeInstance = getStripeInstance();
    
    // チェックアウトセッションを取得
    const session = await stripeInstance.checkout.sessions.retrieve(sessionId);
    
    console.log('CheckSession: セッション取得', {
      sessionId: session.id,
      mode: session.mode,
      subscriptionId: session.subscription,
      customerId: session.customer,
    });

    if (session.mode === 'subscription' && session.subscription) {
      const subscriptionId = session.subscription as string;
      const customerId = session.customer as string;
      const metadataPlanType = session.metadata?.planType as PlanType;

      // サブスクリプションを取得
      const subscription = await stripeInstance.subscriptions.retrieve(subscriptionId);
      
      // 価格IDからplanTypeを取得
      const priceId = subscription.items.data[0]?.price?.id;
      let planType: PlanType = metadataPlanType || 'free';
      
      if (priceId) {
        const growPriceId = process.env.STRIPE_PRICE_ID_GROW;
        const bloomPriceId = process.env.STRIPE_PRICE_ID_BLOOM; // オプション（Bloom Plan準備中）
        
        if (growPriceId && priceId === growPriceId) {
          planType = 'grow';
        } else if (bloomPriceId && priceId === bloomPriceId) {
          planType = 'bloom';
        }
      }

      console.log('CheckSession: サブスクリプション情報', {
        subscriptionId,
        planType,
        status: subscription.status,
        priceId,
      });

      // ユーザー情報を更新
      await updateUser(userId, {
        subscription: {
          ...user.subscription,
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
      }

      console.log('CheckSession: ユーザー情報更新完了', {
        userId,
        planType,
      });

      return NextResponse.json({ 
        planUpdated: true,
        planType,
      }, { 
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }

    return NextResponse.json({ 
      planUpdated: false,
    }, { 
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error: any) {
    console.error('CheckSession: エラー', error);
    return NextResponse.json(
      { error: error.message || 'セッション確認に失敗しました' },
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
}

