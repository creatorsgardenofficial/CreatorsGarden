import { NextResponse } from 'next/server';

export async function GET() {
  // このエンドポイントは無効化されています
  return NextResponse.json(
    { error: 'Not Found' },
    { status: 404 }
  );
}

