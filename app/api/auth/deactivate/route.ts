import { NextRequest, NextResponse } from 'next/server';
import { getUserById, deactivateUser } from '@/lib/storage';
import { checkUserActive } from '@/lib/utils';
import { logSecurityEvent } from '@/lib/securityLog';
import { getClientIp } from '@/lib/utils';

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const userAgent = request.headers.get('user-agent') || 'unknown';
  
  try {
    const userId = request.cookies.get('userId')?.value;
    const { active, user } = await checkUserActive(userId);

    if (!active || !user) {
      return NextResponse.json(
        { error: 'ログインが必要です' },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const reason = body.reason || null;

    // 退会処理
    const deactivatedUser = await deactivateUser(user.id, reason);
    
    if (!deactivatedUser) {
      return NextResponse.json(
        { error: '退会処理に失敗しました' },
        { status: 500 }
      );
    }

    // セキュリティログに記録
    await logSecurityEvent('account_deactivated', {
      userId: user.id,
      email: user.email,
      ip,
      userAgent,
      details: { reason },
      severity: 'medium',
    });

    // Cookieを削除
    const response = NextResponse.json(
      { message: '退会処理が完了しました' },
      { status: 200 }
    );
    
    response.cookies.delete('userId');
    response.cookies.delete('csrfToken');

    return response;
  } catch (error: any) {
    console.error('Deactivate account error:', error);
    return NextResponse.json(
      { error: '退会処理に失敗しました' },
      { status: 500 }
    );
  }
}

