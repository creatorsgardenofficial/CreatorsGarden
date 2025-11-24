import { NextRequest, NextResponse } from 'next/server';
import { getUsers, getUserById } from '@/lib/storage';

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

    const users = await getUsers();
    
    // パスワードを除外して返す
    const usersWithoutPassword = users
      .filter(u => u.isActive !== false) // 利用停止ユーザーを除外
      .map(u => ({
        id: u.id,
        username: u.username,
        email: u.email,
        creatorType: u.creatorType,
        bio: u.bio,
        portfolioUrls: u.portfolioUrls,
        createdAt: u.createdAt,
      }));

    // ページネーション対応
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedUsers = usersWithoutPassword.slice(startIndex, endIndex);
    const hasMore = endIndex < usersWithoutPassword.length;

    return NextResponse.json({ 
      users: paginatedUsers,
      pagination: {
        page,
        limit,
        total: usersWithoutPassword.length,
        hasMore,
      },
    }, { status: 200 });
  } catch (error) {
    console.error('Get users error:', error);
    return NextResponse.json(
      { error: 'ユーザー一覧の取得に失敗しました' },
      { status: 500 }
    );
  }
}

