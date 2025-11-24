import { NextRequest, NextResponse } from 'next/server';
import { getUserById } from '@/lib/storage';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getUserById(id);

    if (!user) {
      return NextResponse.json(
        { error: 'ユーザーが見つかりません' },
        { status: 404 }
      );
    }

    // 利用停止されているユーザーは表示しない
    if (user.isActive === false) {
      return NextResponse.json(
        { error: 'このユーザーは利用停止されています' },
        { status: 403 }
      );
    }

    // パスワードを除外して返す
    const { password: _, ...userWithoutPassword } = user;

    return NextResponse.json({ user: userWithoutPassword }, { status: 200 });
  } catch (error) {
    console.error('Get user profile error:', error);
    return NextResponse.json(
      { error: 'ユーザー情報の取得に失敗しました' },
      { status: 500 }
    );
  }
}

