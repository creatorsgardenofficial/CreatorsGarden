import { NextRequest, NextResponse } from 'next/server';
import { getFeedbackById, updateFeedback, getUserById } from '@/lib/storage';
import { validateContent } from '@/lib/contentFilter';
import { FeedbackMessage } from '@/types';
import { isAdmin } from '@/lib/admin';

// メッセージを追加
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

    // 利用停止チェック
    if (user.isActive === false) {
      return NextResponse.json(
        { error: 'このアカウントは利用停止されています' },
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
    const { content } = body;

    if (!content || !content.trim()) {
      return NextResponse.json(
        { error: 'メッセージ内容が必要です' },
        { status: 400 }
      );
    }

    // コンテンツフィルタリング
    const contentError = validateContent(content);
    if (contentError) {
      return NextResponse.json(
        { error: contentError },
        { status: 400 }
      );
    }

    // 管理者かユーザー本人かチェック
    const isUserAdmin = isAdmin(user.email);
    const isFeedbackOwner = feedback.userId === userId || feedback.email === user.email;

    if (!isUserAdmin && !isFeedbackOwner) {
      return NextResponse.json(
        { error: 'このフィードバックに返信する権限がありません' },
        { status: 403 }
      );
    }

    // メッセージ配列を初期化（既存のメッセージがない場合）
    const messages = feedback.messages ? [...feedback.messages] : [];
    
    // 後方互換性：既存のreplyフィールドがある場合は、最初のメッセージとして追加
    // ただし、既に同じ内容のメッセージが存在しない場合のみ追加
    if (feedback.reply && messages.length === 0) {
      const replyMessageExists = messages.some(
        m => m.content === feedback.reply && m.senderType === 'admin'
      );
      if (!replyMessageExists) {
        messages.push({
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          content: feedback.reply,
          senderId: feedback.repliedBy || '',
          senderType: 'admin' as const,
          createdAt: feedback.repliedAt || feedback.createdAt,
        });
      }
    }

    // 新しいメッセージを追加（一意のIDを生成）
    const newMessage: FeedbackMessage = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      content: content.trim(),
      senderId: userId,
      senderType: isUserAdmin ? 'admin' : 'user',
      createdAt: new Date().toISOString(),
    };
    messages.push(newMessage);

    // フィードバックを更新
    const updatedFeedback = await updateFeedback(id, {
      messages,
      // 後方互換性のため、最後の管理者メッセージをreplyフィールドにも保存
      reply: messages.filter(m => m.senderType === 'admin').slice(-1)[0]?.content || undefined,
      repliedAt: messages.filter(m => m.senderType === 'admin').slice(-1)[0]?.createdAt || undefined,
      repliedBy: messages.filter(m => m.senderType === 'admin').slice(-1)[0]?.senderId || undefined,
    });

    if (!updatedFeedback) {
      return NextResponse.json(
        { error: 'メッセージの保存に失敗しました' },
        { status: 500 }
      );
    }

    return NextResponse.json({ feedback: updatedFeedback }, { status: 200 });
  } catch (error) {
    console.error('Add feedback message error:', error);
    return NextResponse.json(
      { error: 'メッセージの送信に失敗しました' },
      { status: 500 }
    );
  }
}

