import { NextRequest, NextResponse } from 'next/server';
import { shouldUseDatabaseStorage } from '@/lib/storage';
import { createAccessLog } from '@/lib/storage-db';
import { getClientIp } from '@/lib/utils';

/**
 * アクセスログを記録するAPIエンドポイント
 * middlewareから非同期で呼び出される
 */
export async function POST(request: NextRequest) {
  try {
    // データベースが利用可能でない場合はスキップ
    if (!shouldUseDatabaseStorage()) {
      return NextResponse.json({ success: true, skipped: true }, { status: 200 });
    }

    const body = await request.json();
    const { path, method, userId, ipAddress, userAgent, referer } = body;

    if (!path || !method) {
      return NextResponse.json(
        { error: 'path and method are required' },
        { status: 400 }
      );
    }

    // アクセスログを記録（非同期で実行、エラーが発生してもレスポンスをブロックしない）
    createAccessLog({
      path,
      method,
      userId: userId || undefined,
      ipAddress: ipAddress || undefined,
      userAgent: userAgent || undefined,
      referer: referer || undefined,
    }).catch((error) => {
      console.error('Failed to log access (non-blocking):', error);
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Access log API error:', error);
    // エラーが発生しても200を返す（アクセスログの記録失敗でサイトが停止しないように）
    return NextResponse.json({ success: false }, { status: 200 });
  }
}

