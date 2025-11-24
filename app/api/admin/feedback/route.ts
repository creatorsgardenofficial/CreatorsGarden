import { NextRequest, NextResponse } from 'next/server';
import { getFeedbacks, deleteFeedback } from '@/lib/storage';
import { getUserById } from '@/lib/storage';
import { isAdmin } from '@/lib/admin';

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

    const feedbacks = await getFeedbacks();
    
    // 新しい順にソート（既にunshiftで先頭に追加されているが、念のため）
    const sortedFeedbacks = feedbacks.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return NextResponse.json({ feedbacks: sortedFeedbacks }, { status: 200 });
  } catch (error) {
    console.error('Get feedbacks error:', error);
    return NextResponse.json(
      { error: 'フィードバックの取得に失敗しました' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
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

    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'フィードバックIDが必要です' },
        { status: 400 }
      );
    }

    const deleted = await deleteFeedback(id);
    if (!deleted) {
      return NextResponse.json(
        { error: 'フィードバックが見つかりません' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Delete feedback error:', error);
    return NextResponse.json(
      { error: 'フィードバックの削除に失敗しました' },
      { status: 500 }
    );
  }
}

