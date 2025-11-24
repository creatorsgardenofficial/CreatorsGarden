import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getUserById } from '@/lib/storage';

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
      console.error('Stripe initialization error:', error);
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
        { 
          status: 401,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const user = await getUserById(userId);
    if (!user) {
      return NextResponse.json(
        { error: 'ユーザーが見つかりません' },
        { 
          status: 404,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const customerId = user.subscription?.stripeCustomerId;
    if (!customerId) {
      return NextResponse.json(
        { error: 'サブスクリプションが見つかりません' },
        { 
          status: 404,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // カスタマーポータルセッションを作成
    try {
      const portalSession = await stripeInstance.billingPortal.sessions.create({
        customer: customerId,
        return_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/profile`,
      });

      return NextResponse.json({ 
        url: portalSession.url 
      }, { 
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    } catch (stripeError: any) {
      console.error('Stripe portal session creation error:', stripeError);
      return NextResponse.json(
        { error: `ポータルセッションの作成に失敗しました: ${stripeError.message || '不明なエラー'}` },
        { 
          status: 500,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }
  } catch (error: any) {
    console.error('Unexpected error in create-portal:', error);
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

