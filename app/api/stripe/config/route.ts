import { NextResponse } from 'next/server';

// Stripe公開キーを返す（フロントエンドで使用）
export async function GET() {
  const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  
  if (!stripePublishableKey) {
    return NextResponse.json(
      { error: 'Stripe公開キーが設定されていません' },
      { status: 500 }
    );
  }
  
  return NextResponse.json({ 
    publishableKey: stripePublishableKey 
  }, { status: 200 });
}

