import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getUserById, updateUser, getPosts, savePosts } from '@/lib/storage';
import { PlanType } from '@/types';

// Stripeインスタンスを遅延初期化（環境変数が設定されている場合のみ）
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

export async function POST(request: NextRequest) {
  try {
    // Stripeインスタンスの取得（環境変数チェックも含む）
    let stripeInstance: Stripe;
    try {
      stripeInstance = getStripeInstance();
    } catch (error: any) {
      return NextResponse.json(
        { error: 'Stripe設定が完了していません' },
        { 
          status: 500,
          headers: {
            'Content-Type': 'application/json',
          },
        }
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


    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      // リクエストボディのパースエラー
      return NextResponse.json(
        { error: 'リクエストの形式が正しくありません' },
        { status: 400 }
      );
    }
    const { planType } = body;


    if (!planType || !['grow', 'bloom'].includes(planType)) {
      // 無効なプラン
      return NextResponse.json(
        { error: '無効なプランです' },
        { status: 400 }
      );
    }

    // TypeScriptの型チェックのために型アサーション
    const validPlanType = planType as PlanType;

    // Grow Planは準備中のため、新規購入を拒否（既存のサブスクリプションの更新は許可）
    if (validPlanType === 'grow') {
      const hasActiveGrowSubscription = user.subscription?.planType === 'grow' && 
                                       user.subscription?.status === 'active' &&
                                       user.subscription?.stripeSubscriptionId;
      
      if (!hasActiveGrowSubscription) {
        return NextResponse.json(
          { error: 'Grow Plan（成長プラン）は現在準備中です。' },
          { status: 400 }
        );
      }
      // 既存のGrow Planサブスクリプションの更新は許可（プラン変更など）
    }

    // プラン価格IDのマッピング（Stripeダッシュボードで作成した価格IDを設定）
    const priceIds: Record<PlanType, string> = {
      free: '',
      grow: process.env.STRIPE_PRICE_ID_GROW || '',
      bloom: process.env.STRIPE_PRICE_ID_BLOOM || '',
    };

    const priceId = priceIds[validPlanType];

    if (!priceId) {
      
      let errorMessage = 'プランの価格IDが設定されていません。';
      if (validPlanType === 'grow') {
        errorMessage += '.env.localファイルのSTRIPE_PRICE_ID_GROWを確認してください。';
      } else if (validPlanType === 'bloom') {
        errorMessage += 'Bloom Planは現在準備中です。.env.localファイルのSTRIPE_PRICE_ID_BLOOMを設定してください。';
      } else {
        errorMessage += '.env.localファイルのSTRIPE_PRICE_ID_GROWまたはSTRIPE_PRICE_ID_BLOOMを確認してください。';
      }
      
      return NextResponse.json(
        { error: errorMessage },
        { status: 500 }
      );
    }

    // Stripe顧客を作成または取得
    let customerId = user.subscription?.stripeCustomerId;
    
    if (!customerId) {
      try {
        const customer = await stripeInstance.customers.create({
          email: user.email,
          metadata: {
            userId: user.id,
          },
        });
        customerId = customer.id;
      } catch (stripeError: any) {
        return NextResponse.json(
          { error: `Stripe顧客の作成に失敗しました: ${stripeError.message || '不明なエラー'}` },
          { status: 500 }
        );
      }
      
      // ユーザーに顧客IDを保存
      try {
        await updateUser(user.id, {
          subscription: {
            ...user.subscription,
            stripeCustomerId: customerId,
            planType: user.subscription?.planType || 'free',
            status: user.subscription?.status || 'active',
          },
        });
      } catch (updateError) {
        console.error('User update error:', updateError);
        // 顧客IDは作成できたので、エラーを無視して続行
      }
    }

    // 既存のアクティブなサブスクリプションを確認
    // まず、データベースに保存されているsubscriptionIdを確認
    let existingSubscription = null;
    
    if (user.subscription?.stripeSubscriptionId && user.subscription?.status === 'active') {
      try {
        existingSubscription = await stripeInstance.subscriptions.retrieve(
          user.subscription.stripeSubscriptionId
        );
      } catch (error: any) {
        existingSubscription = null;
      }
    }
    
    // データベースにsubscriptionIdがない場合、Stripeから検索
    if (!existingSubscription && customerId) {
      try {
        const subscriptions = await stripeInstance.subscriptions.list({
          customer: customerId,
          status: 'active',
          limit: 1,
        });
        
        if (subscriptions.data.length > 0) {
          existingSubscription = subscriptions.data[0];
        }
      } catch (error: any) {
      }
    }
    
    // 既存のサブスクリプションがある場合は更新
    if (existingSubscription && existingSubscription.status === 'active') {
      try {
        // サブスクリプションを更新
        await stripeInstance.subscriptions.update(existingSubscription.id, {
          items: [{
            id: existingSubscription.items.data[0].id,
            price: priceId,
          }],
          proration_behavior: 'always_invoice',
        });

        // 更新後のサブスクリプション情報を取得
        const updatedSubscription = await stripeInstance.subscriptions.retrieve(
          existingSubscription.id
        );

        // プラン変更に伴い、ユーザー情報を即座に更新（Webhookを待たない）
        await updateUser(user.id, {
          subscription: {
            ...user.subscription,
            stripeCustomerId: customerId,
            stripeSubscriptionId: updatedSubscription.id,
            planType: validPlanType,
            status: updatedSubscription.status as any,
            currentPeriodEnd: new Date(updatedSubscription.current_period_end * 1000).toISOString(),
            cancelAtPeriodEnd: updatedSubscription.cancel_at_period_end,
          },
        });
        
        // プラン変更に伴い、既存の投稿の優先表示フラグを更新
        const isActive = updatedSubscription.status === 'active';
        const shouldHavePriority = (validPlanType === 'grow' || validPlanType === 'bloom') && isActive;
        
        const posts = await getPosts();
        let updated = false;
        for (let i = 0; i < posts.length; i++) {
          if (posts[i].userId === user.id) {
            posts[i].priorityDisplay = shouldHavePriority;
            posts[i].featuredDisplay = shouldHavePriority;
            posts[i].updatedAt = new Date().toISOString();
            updated = true;
          }
        }
        if (updated) {
          await savePosts(posts);
        }
        
        return NextResponse.json({ 
          message: 'プランが更新されました',
          subscriptionId: updatedSubscription.id,
          planUpdated: true, // フロントエンドで即座に更新できるようにフラグを追加
        }, { 
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
        });
      } catch (stripeError: any) {
        console.error('Checkout: Stripe subscription update error:', stripeError);
        return NextResponse.json(
          { error: `サブスクリプションの更新に失敗しました: ${stripeError.message || '不明なエラー'}` },
          { 
            status: 500,
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );
      }
    }

    // 新しいチェックアウトセッションを作成
    console.log('Checkout: 新しいチェックアウトセッションを作成', {
      customerId,
      priceId,
      planType: validPlanType,
    });
    
    try {
      const session = await stripeInstance.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/pricing?success=true&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/pricing?canceled=true`,
        metadata: {
          userId: user.id,
          planType: validPlanType,
        },
      });

      console.log('Checkout: チェックアウトセッション作成完了', {
        sessionId: session.id,
        url: session.url,
      });

      return NextResponse.json({ 
        sessionId: session.id,
        url: session.url 
      }, { 
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    } catch (stripeError: any) {
      console.error('Checkout: Stripe checkout session creation error:', stripeError);
      return NextResponse.json(
        { error: `決済セッションの作成に失敗しました: ${stripeError.message || '不明なエラー'}` },
        { 
          status: 500,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }
  } catch (error: any) {
    console.error('Unexpected error in create-checkout:', error);
    // エラーがErrorオブジェクトでない場合の処理
    const errorMessage = error?.message || error?.toString() || '不明なエラーが発生しました';
    return NextResponse.json(
      { error: errorMessage },
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
}

