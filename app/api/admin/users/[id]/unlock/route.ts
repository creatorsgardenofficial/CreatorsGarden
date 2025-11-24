import { NextRequest, NextResponse } from 'next/server';
import { getUserById, updateUser } from '@/lib/storage';
import { isAdmin } from '@/lib/admin';
import { logSecurityEvent } from '@/lib/securityLog';
import { getClientIp } from '@/lib/utils';

/**
 * アカウントロック解除（管理者のみ）
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const targetUser = await getUserById(id);

    if (!targetUser) {
      return NextResponse.json(
        { error: '対象ユーザーが見つかりません' },
        { status: 404 }
      );
    }

    // ロック状態を解除
    const updatedUser = await updateUser(id, {
      accountLockedUntil: undefined,
      failedLoginAttempts: 0,
    });

    if (!updatedUser) {
      return NextResponse.json(
        { error: 'アカウントロック解除に失敗しました' },
        { status: 500 }
      );
    }

    // セキュリティログに記録
    const ip = getClientIp(request);
    const userAgent = request.headers.get('user-agent') || 'unknown';
    await logSecurityEvent('admin_action', {
      userId: id,
      email: targetUser.email,
      ip,
      userAgent,
      details: {
        action: 'account_unlock',
        changedBy: userId,
        targetUserId: id,
      },
      severity: 'medium',
    });

    // パスワードを除外して返す
    const { password: _, ...userWithoutPassword } = updatedUser;

    return NextResponse.json({ user: userWithoutPassword }, { status: 200 });
  } catch (error) {
    console.error('Unlock account error:', error);
    return NextResponse.json(
      { error: 'アカウントロック解除に失敗しました' },
      { status: 500 }
    );
  }
}

