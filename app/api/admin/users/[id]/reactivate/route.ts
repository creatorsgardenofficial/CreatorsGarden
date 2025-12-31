import { NextRequest, NextResponse } from 'next/server';
import { getUserById, reactivateUser } from '@/lib/storage';
import { isAdmin } from '@/lib/admin';
import { logSecurityEvent } from '@/lib/securityLog';
import { getClientIp } from '@/lib/utils';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ip = getClientIp(request);
  const userAgent = request.headers.get('user-agent') || 'unknown';

  try {
    const userId = request.cookies.get('userId')?.value;

    if (!userId) {
      return NextResponse.json(
        { error: 'ログインが必要です' },
        { status: 401 }
      );
    }

    const adminUser = await getUserById(userId);
    if (!adminUser) {
      return NextResponse.json(
        { error: 'ユーザーが見つかりません' },
        { status: 404 }
      );
    }

    // 管理者チェック
    if (!isAdmin(adminUser.email)) {
      return NextResponse.json(
        { error: '管理者権限が必要です' },
        { status: 403 }
      );
    }

    const { id: targetUserId } = await params;
    const targetUser = await getUserById(targetUserId);

    if (!targetUser) {
      return NextResponse.json(
        { error: '対象ユーザーが見つかりません' },
        { status: 404 }
      );
    }

    // 退会済みかチェック
    if (!targetUser.deactivatedAt) {
      return NextResponse.json(
        { error: 'このアカウントは退会していません' },
        { status: 400 }
      );
    }

    // 復旧処理
    const reactivatedUser = await reactivateUser(targetUserId);

    if (!reactivatedUser) {
      return NextResponse.json(
        { error: 'アカウントの復旧に失敗しました' },
        { status: 500 }
      );
    }

    // セキュリティログに記録
    await logSecurityEvent('account_reactivated', {
      userId: targetUserId,
      email: targetUser.email,
      ip,
      userAgent,
      details: { reactivatedBy: userId, targetUserId },
      severity: 'medium',
    });

    // パスワードを除外して返す
    const { password: _, ...userWithoutPassword } = reactivatedUser;

    return NextResponse.json({ user: userWithoutPassword }, { status: 200 });
  } catch (error: any) {
    console.error('Reactivate user error:', error);
    return NextResponse.json(
      { error: 'アカウントの復旧に失敗しました' },
      { status: 500 }
    );
  }
}

