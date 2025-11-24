import { NextRequest, NextResponse } from 'next/server';
import { getUserById } from '@/lib/storage';
import {
  getConversationsByUserId,
  getConversationByParticipants,
  createConversation,
  getMessagesByConversationId,
  createMessage,
  updateConversation,
  markMessagesAsRead,
  getUnreadMessageCount,
} from '@/lib/storage';
import { validateContent } from '@/lib/contentFilter';
import { checkUserActive } from '@/lib/utils';

// 会話一覧取得
export async function GET(request: NextRequest) {
  try {
    const userId = request.cookies.get('userId')?.value;
    const { active, user } = await checkUserActive(userId);

    if (!active) {
      return NextResponse.json(
        { error: 'ログインが必要です' },
        { status: 401 }
      );
    }

    const url = new URL(request.url);
    const conversationId = url.searchParams.get('conversationId');
    const unreadCount = url.searchParams.get('unreadCount') === 'true';

    // 未読メッセージ数のみ取得
    if (unreadCount) {
      const count = await getUnreadMessageCount(userId!);
      return NextResponse.json({ unreadCount: count }, { status: 200 });
    }

    // 特定の会話のメッセージ取得
    if (conversationId) {
      const messages = await getMessagesByConversationId(conversationId);
      
      // ブロックリストを取得
      const { getBlockedUserIds } = await import('@/lib/storage');
      const blockedUserIds = await getBlockedUserIds(userId!);
      
      // ブロックされたユーザーからのメッセージをフィルタリング
      const filteredMessages = messages.filter(m => {
        // 自分が送信したメッセージは常に表示
        if (m.senderId === userId) return true;
        // ブロックされたユーザーからのメッセージは非表示
        return !blockedUserIds.includes(m.senderId);
      });
      
      // メッセージを取得したら既読にする
      await markMessagesAsRead(conversationId, userId!);
      return NextResponse.json({ messages: filteredMessages }, { status: 200 });
    }

    // 会話一覧取得
    const conversations = await getConversationsByUserId(userId!);
    
    // ブロックリストを取得
    const { getBlockedUserIds } = await import('@/lib/storage');
    const blockedUserIds = await getBlockedUserIds(userId!);
    
    // 各会話の最新メッセージと未読数を取得
    const conversationsWithDetails = await Promise.all(
      conversations.map(async (conv) => {
        const otherUserId = conv.participantIds.find(id => id !== userId);
        
        // ブロックされたユーザーの会話は除外
        if (otherUserId && blockedUserIds.includes(otherUserId)) {
          return null;
        }
        
        const messages = await getMessagesByConversationId(conv.id);
        const lastMessage = messages[messages.length - 1];
        const unreadCount = messages.filter(m => m.receiverId === userId && !m.read).length;
        const otherUser = otherUserId ? await getUserById(otherUserId) : null;

        return {
          ...conv,
          lastMessage: lastMessage || null,
          unreadCount,
          otherUser: otherUser ? {
            id: otherUser.id,
            username: otherUser.username,
            creatorType: otherUser.creatorType,
          } : null,
        };
      })
    );
    
    // nullを除外
    const filteredConversations = conversationsWithDetails.filter(conv => conv !== null);

    return NextResponse.json({ conversations: filteredConversations }, { status: 200 });
  } catch (error) {
    console.error('Get messages error:', error);
    return NextResponse.json(
      { error: 'メッセージの取得に失敗しました' },
      { status: 500 }
    );
  }
}

// メッセージ送信
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
    const { receiverId, content } = body;

    if (!receiverId || !content) {
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

    // 受信者の存在確認
    const receiver = await getUserById(receiverId);
    if (!receiver) {
      return NextResponse.json(
        { error: '受信者が見つかりません' },
        { status: 404 }
      );
    }

    // 自分自身への送信は不可
    if (userId === receiverId) {
      return NextResponse.json(
        { error: '自分自身にメッセージを送信することはできません' },
        { status: 400 }
      );
    }

    // ブロックチェック
    const { isUserBlocked } = await import('@/lib/storage');
    const isBlocked = await isUserBlocked(userId!, receiverId);
    if (isBlocked) {
      return NextResponse.json(
        { error: 'このユーザーはブロックされています' },
        { status: 403 }
      );
    }
    
    // 相手が自分をブロックしているかチェック
    const isBlockedByOther = await isUserBlocked(receiverId, userId!);
    if (isBlockedByOther) {
      return NextResponse.json(
        { error: 'メッセージを送信することはできません' },
        { status: 403 }
      );
    }

    // 会話を取得または作成
    let conversation = await getConversationByParticipants(userId!, receiverId);
    if (!conversation) {
      conversation = await createConversation([userId!, receiverId]);
    }

    // メッセージを作成
    const message = await createMessage({
      conversationId: conversation.id,
      senderId: userId!,
      receiverId,
      content,
    });

    // 会話の最終メッセージ情報を更新
    await updateConversation(conversation.id, {
      lastMessageId: message.id,
      lastMessageAt: message.createdAt,
    });

    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    console.error('Create message error:', error);
    return NextResponse.json(
      { error: 'メッセージの送信に失敗しました' },
      { status: 500 }
    );
  }
}

