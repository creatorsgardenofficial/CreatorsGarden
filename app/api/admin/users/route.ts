import { NextRequest, NextResponse } from 'next/server';
import { getUsers, updateUser, getUserById } from '@/lib/storage';
import { validatePassword } from '@/lib/contentFilter';
import { hashPassword } from '@/lib/password';
import { logSecurityEvent } from '@/lib/securityLog';
import { User } from '@/types';
import { isAdmin } from '@/lib/admin';
import { getClientIp } from '@/lib/utils';

export async function GET(request: NextRequest) {
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

    // 管理者チェック
    if (!isAdmin(user.email)) {
      return NextResponse.json(
        { error: '管理者権限が必要です' },
        { status: 403 }
      );
    }

    const users = await getUsers();
    
    // パスワードを除外して返す
    const usersWithoutPassword = users.map(u => ({
      ...u,
      password: undefined,
    }));

    return NextResponse.json({ users: usersWithoutPassword }, { status: 200 });
  } catch (error) {
    console.error('Get users error:', error);
    return NextResponse.json(
      { error: 'ユーザー一覧の取得に失敗しました' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
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

    const body = await request.json();
    const { targetUserId, password, isActive } = body;

    if (!targetUserId) {
      return NextResponse.json(
        { error: 'ユーザーIDが必要です' },
        { status: 400 }
      );
    }

    const targetUser = await getUserById(targetUserId);
    if (!targetUser) {
      return NextResponse.json(
        { error: '対象ユーザーが見つかりません' },
        { status: 404 }
      );
    }

    const updates: Partial<User> = {};

    // パスワード変更
    if (password !== undefined) {
      const passwordError = validatePassword(password);
      if (passwordError) {
        return NextResponse.json(
          { error: passwordError },
          { status: 400 }
        );
      }
      // パスワードをハッシュ化
      const hashedPassword = await hashPassword(password);
      updates.password = hashedPassword;
      
      // パスワード変更を記録
      const ip = getClientIp(request);
      const userAgent = request.headers.get('user-agent') || 'unknown';
      await logSecurityEvent('password_change', {
        userId: targetUserId,
        email: targetUser.email,
        ip,
        userAgent,
        details: { changedBy: userId, targetUserId },
        severity: 'medium',
      });
    }

    // 利用停止/有効化
    if (isActive !== undefined) {
      updates.isActive = isActive;
      
      // アカウント状態変更を記録
      const ip = getClientIp(request);
      const userAgent = request.headers.get('user-agent') || 'unknown';
      await logSecurityEvent(
        isActive ? 'account_activated' : 'account_suspended',
        {
          userId: targetUserId,
          email: targetUser.email,
          ip,
          userAgent,
          details: { changedBy: userId, targetUserId },
          severity: isActive ? 'medium' : 'high',
        }
      );
    }

    const updatedUser = await updateUser(targetUserId, updates);
    if (!updatedUser) {
      return NextResponse.json(
        { error: 'ユーザーの更新に失敗しました' },
        { status: 500 }
      );
    }

    // パスワードを除外して返す
    const { password: _, ...userWithoutPassword } = updatedUser;

    return NextResponse.json({ user: userWithoutPassword }, { status: 200 });
  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json(
      { error: 'ユーザーの更新に失敗しました' },
      { status: 500 }
    );
  }
}

