import { NextRequest, NextResponse } from 'next/server';
import { getBookmarkCount } from '@/lib/storage';

// ブックマーク数取得
export async function GET(request: NextRequest) {
  try {
    const userId = request.cookies.get('userId')?.value;

    if (!userId) {
      return NextResponse.json(
        { error: 'ログインが必要です' },
        { status: 401 }
      );
    }

    const count = await getBookmarkCount(userId);
    return NextResponse.json({ count }, { status: 200 });
  } catch (error) {
    console.error('Get bookmark count error:', error);
    return NextResponse.json(
      { error: 'ブックマーク数の取得に失敗しました' },
      { status: 500 }
    );
  }
}

