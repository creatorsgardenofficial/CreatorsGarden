import { NextRequest, NextResponse } from 'next/server';
import { getUserByPublicId, getUserById } from '@/lib/storage';

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

    // 利用停止チェック
    if (user.isActive === false) {
      return NextResponse.json(
        { error: 'このアカウントは利用停止されています' },
        { status: 403 }
      );
    }

    const url = new URL(request.url);
    const publicId = url.searchParams.get('publicId');
    const username = url.searchParams.get('username');

    if (!publicId && !username) {
      return NextResponse.json(
        { error: '表示用IDまたはユーザー名が必要です' },
        { status: 400 }
      );
    }

    if (publicId) {
      // 表示用IDの場合は完全一致で1件のみ返す
      const targetUser = await getUserByPublicId(publicId);
      if (!targetUser) {
        return NextResponse.json(
          { error: 'ユーザーが見つかりません' },
          { status: 404 }
        );
      }
      // 自分自身は検索できない
      if (targetUser.id === userId) {
        return NextResponse.json(
          { error: '自分自身を検索することはできません' },
          { status: 400 }
        );
      }
      // パスワードを除外して返す
      const { password: _, ...userWithoutPassword } = targetUser;
      return NextResponse.json({ user: userWithoutPassword }, { status: 200 });
    } else if (username) {
      // ユーザー名の場合は部分一致で複数件返す
      const { getUsers } = await import('@/lib/storage');
      const allUsers = await getUsers();
      const searchQuery = username.toLowerCase().trim();
      // 部分一致検索で複数件取得
      const matchedUsers = allUsers.filter(u => 
        u.username.toLowerCase().includes(searchQuery) && 
        u.isActive !== false &&
        u.id !== userId
      );

      if (matchedUsers.length === 0) {
        return NextResponse.json(
          { error: 'ユーザーが見つかりません' },
          { status: 404 }
        );
      }

      // パスワードを除外して返す
      const usersWithoutPassword = matchedUsers.map(u => {
        const { password: _, ...userWithoutPassword } = u;
        return userWithoutPassword;
      });

      return NextResponse.json({ users: usersWithoutPassword }, { status: 200 });
    }
  } catch (error) {
    console.error('Search user error:', error);
    return NextResponse.json(
      { error: 'ユーザー検索に失敗しました' },
      { status: 500 }
    );
  }
}

