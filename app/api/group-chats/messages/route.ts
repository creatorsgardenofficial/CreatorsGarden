import { NextRequest, NextResponse } from 'next/server';
import { getUserById } from '@/lib/storage';
import {
  getGroupChatById,
  createGroupMessage,
  updateGroupChat,
} from '@/lib/storage';
import { validateContent } from '@/lib/contentFilter';
import { checkUserActive } from '@/lib/utils';

// グループメッセージ送信
export async function POST(request: NextRequest) {
  try {
    const userId = request.cookies.get('userId')?.value;
    const { active, user } = await checkUserActive(userId);

    if (!active) {
      return NextResponse.json(
        { error: 'ログインが必要です' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { groupChatId, content } = body;

    if (!groupChatId || !content) {
      return NextResponse.json(
        { error: '必須項目が不足しています' },
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

    // グループチャットの存在確認と参加者チェック
    const groupChat = await getGroupChatById(groupChatId);
    if (!groupChat) {
      return NextResponse.json(
        { error: 'グループチャットが見つかりません' },
        { status: 404 }
      );
    }

    if (!groupChat.participantIds.includes(userId!)) {
      return NextResponse.json(
        { error: 'このグループチャットに参加していません' },
        { status: 403 }
      );
    }

    // メッセージを作成
    const message = await createGroupMessage({
      groupChatId,
      senderId: userId!,
      senderUsername: user!.username,
      content,
    });

    // グループチャットの最終メッセージ情報を更新
    await updateGroupChat(groupChatId, {
      lastMessageId: message.id,
      lastMessageAt: message.createdAt,
    });

    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    console.error('Create group message error:', error);
    return NextResponse.json(
      { error: 'メッセージの送信に失敗しました' },
      { status: 500 }
    );
  }
}

