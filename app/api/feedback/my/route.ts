import { NextRequest, NextResponse } from 'next/server';
import { getFeedbacks, getUserById } from '@/lib/storage';

// ログインユーザーが自分のフィードバックを取得
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

    const allFeedbacks = await getFeedbacks();
    
    // ユーザーIDまたはメールアドレスでフィルタリング
    const myFeedbacks = allFeedbacks.filter(f => 
      f.userId === userId || f.email === user.email
    );

    // 新しい順にソート
    const sortedFeedbacks = myFeedbacks.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return NextResponse.json({ feedbacks: sortedFeedbacks }, { status: 200 });
  } catch (error) {
    console.error('Get my feedbacks error:', error);
    return NextResponse.json(
      { error: 'フィードバックの取得に失敗しました' },
      { status: 500 }
    );
  }
}

