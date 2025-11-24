import { NextRequest, NextResponse } from 'next/server';
import { getUserById } from '@/lib/storage';
import {
  getMessageById,
  updateMessage,
  deleteMessage,
} from '@/lib/storage';
import { validateContent } from '@/lib/contentFilter';
import { checkUserActive } from '@/lib/utils';

// メッセージ編集
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = request.cookies.get('userId')?.value;
    const { active } = await checkUserActive(userId);

    if (!active) {
      return NextResponse.json(
        { error: 'ログインが必要です' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { content } = body;

    if (!content) {
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

    // メッセージを取得
    const message = await getMessageById(id);
    if (!message) {
      return NextResponse.json(
        { error: 'メッセージが見つかりません' },
        { status: 404 }
      );
    }

    // 送信者のみ編集可能
    if (message.senderId !== userId) {
      return NextResponse.json(
        { error: 'このメッセージを編集する権限がありません' },
        { status: 403 }
      );
    }

    // メッセージを更新
    const updatedMessage = await updateMessage(id, { content });
    if (!updatedMessage) {
      return NextResponse.json(
        { error: 'メッセージの更新に失敗しました' },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: updatedMessage }, { status: 200 });
  } catch (error) {
    console.error('Update message error:', error);
    return NextResponse.json(
      { error: 'メッセージの更新に失敗しました' },
      { status: 500 }
    );
  }
}

// メッセージ削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = request.cookies.get('userId')?.value;
    const { active } = await checkUserActive(userId);

    if (!active) {
      return NextResponse.json(
        { error: 'ログインが必要です' },
        { status: 401 }
      );
    }

    const { id } = await params;

    // メッセージを取得
    const message = await getMessageById(id);
    if (!message) {
      return NextResponse.json(
        { error: 'メッセージが見つかりません' },
        { status: 404 }
      );
    }

    // 送信者のみ削除可能
    if (message.senderId !== userId) {
      return NextResponse.json(
        { error: 'このメッセージを削除する権限がありません' },
        { status: 403 }
      );
    }

    // メッセージを削除
    const deleted = await deleteMessage(id);
    if (!deleted) {
      return NextResponse.json(
        { error: 'メッセージの削除に失敗しました' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Delete message error:', error);
    return NextResponse.json(
      { error: 'メッセージの削除に失敗しました' },
      { status: 500 }
    );
  }
}

