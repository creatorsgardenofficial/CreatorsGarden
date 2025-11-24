import { NextRequest, NextResponse } from 'next/server';
import { getFeedbackById, updateFeedback, getUserById } from '@/lib/storage';
import { validateContent } from '@/lib/contentFilter';
import { isAdmin } from '@/lib/admin';

// 返信を送信
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

    const { id } = await params;
    const feedback = await getFeedbackById(id);

    if (!feedback) {
      return NextResponse.json(
        { error: 'フィードバックが見つかりません' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { reply } = body;

    if (!reply || !reply.trim()) {
      return NextResponse.json(
        { error: '返信内容が必要です' },
        { status: 400 }
      );
    }

    // コンテンツフィルタリング
    const contentError = validateContent(reply);
    if (contentError) {
      return NextResponse.json(
        { error: contentError },
        { status: 400 }
      );
    }

    // 返信を更新
    const now = new Date().toISOString();
    const updatedFeedback = await updateFeedback(id, {
      reply: reply.trim(),
      repliedAt: now,
      repliedBy: userId,
    });

    if (!updatedFeedback) {
      return NextResponse.json(
        { error: '返信の保存に失敗しました' },
        { status: 500 }
      );
    }

    return NextResponse.json({ feedback: updatedFeedback }, { status: 200 });
  } catch (error) {
    console.error('Reply to feedback error:', error);
    return NextResponse.json(
      { error: '返信の送信に失敗しました' },
      { status: 500 }
    );
  }
}

// 返信を削除
export async function DELETE(
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

    const { id } = await params;
    const feedback = await getFeedbackById(id);

    if (!feedback) {
      return NextResponse.json(
        { error: 'フィードバックが見つかりません' },
        { status: 404 }
      );
    }

    // 返信を削除
    const updatedFeedback = await updateFeedback(id, {
      reply: undefined,
      repliedAt: undefined,
      repliedBy: undefined,
    });

    if (!updatedFeedback) {
      return NextResponse.json(
        { error: '返信の削除に失敗しました' },
        { status: 500 }
      );
    }

    return NextResponse.json({ feedback: updatedFeedback }, { status: 200 });
  } catch (error) {
    console.error('Delete reply error:', error);
    return NextResponse.json(
      { error: '返信の削除に失敗しました' },
      { status: 500 }
    );
  }
}

