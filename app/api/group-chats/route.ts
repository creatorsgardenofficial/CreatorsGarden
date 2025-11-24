import { NextRequest, NextResponse } from 'next/server';
import { getUserById, getUserByPublicId } from '@/lib/storage';
import {
  getGroupChatsByUserId,
  getGroupChatById,
  createGroupChat,
  updateGroupChat,
  getGroupMessagesByGroupChatId,
  createGroupMessage,
  markGroupMessageAsRead,
  addParticipantToGroupChat,
  removeParticipantFromGroupChat,
} from '@/lib/storage';
import { validateContent } from '@/lib/contentFilter';
import { checkUserActive } from '@/lib/utils';

// グループチャット一覧取得、または特定のグループチャットのメッセージ取得
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
    const groupChatId = url.searchParams.get('groupChatId');
    const unreadCount = url.searchParams.get('unreadCount') === 'true';

    // 未読メッセージ数のみ取得
    if (unreadCount) {
      const groupChats = await getGroupChatsByUserId(userId!);
      let totalUnreadCount = 0;
      
      for (const gc of groupChats) {
        const messages = await getGroupMessagesByGroupChatId(gc.id);
        const unreadMessages = messages.filter(m => !m.readBy.includes(userId!));
        totalUnreadCount += unreadMessages.length;
      }
      
      return NextResponse.json({ unreadCount: totalUnreadCount }, { status: 200 });
    }

    // 特定のグループチャットのメッセージ取得
    if (groupChatId) {
      const groupChat = await getGroupChatById(groupChatId);
      if (!groupChat) {
        return NextResponse.json(
          { error: 'グループチャットが見つかりません' },
          { status: 404 }
        );
      }

      // 参加者チェック
      if (!groupChat.participantIds.includes(userId!)) {
        return NextResponse.json(
          { error: 'このグループチャットに参加していません' },
          { status: 403 }
        );
      }

      const messages = await getGroupMessagesByGroupChatId(groupChatId);
      // メッセージを取得したら既読にする
      for (const message of messages) {
        if (!message.readBy.includes(userId!)) {
          await markGroupMessageAsRead(message.id, userId!);
        }
      }

      return NextResponse.json({ messages }, { status: 200 });
    }

    // グループチャット一覧取得
    const groupChats = await getGroupChatsByUserId(userId!);
    
    // 各グループチャットの最新メッセージと参加者情報を取得
    const groupChatsWithDetails = await Promise.all(
      groupChats.map(async (gc) => {
        const messages = await getGroupMessagesByGroupChatId(gc.id);
        const lastMessage = messages[messages.length - 1];
        const unreadCount = messages.filter(m => !m.readBy.includes(userId!)).length;
        
        // 参加者情報を取得
        const participants = await Promise.all(
          gc.participantIds.map(async (pid) => {
            const participant = await getUserById(pid);
            return participant ? {
              id: participant.id,
              username: participant.username,
              creatorType: participant.creatorType,
              publicId: participant.publicId,
            } : null;
          })
        );

        return {
          ...gc,
          lastMessage: lastMessage || null,
          unreadCount,
          participants: participants.filter((p): p is NonNullable<typeof p> => p !== null),
        };
      })
    );

    return NextResponse.json({ groupChats: groupChatsWithDetails }, { status: 200 });
  } catch (error) {
    console.error('Get group chats error:', error);
    return NextResponse.json(
      { error: 'グループチャットの取得に失敗しました' },
      { status: 500 }
    );
  }
}

// グループチャット作成
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
    const { name, description, participantPublicIds } = body;

    if (!name || !participantPublicIds || !Array.isArray(participantPublicIds)) {
      return NextResponse.json(
        { error: '必須項目が不足しています' },
        { status: 400 }
      );
    }

    // コンテンツフィルタリング
    const nameError = validateContent(name);
    if (nameError) {
      return NextResponse.json(
        { error: nameError },
        { status: 400 }
      );
    }

    if (description) {
      const descError = validateContent(description);
      if (descError) {
        return NextResponse.json(
          { error: descError },
          { status: 400 }
        );
      }
    }

    // 表示用IDからユーザーIDを取得
    const participantIds: string[] = [userId!]; // 作成者を含める

    for (const publicId of participantPublicIds) {
      const targetUser = await getUserByPublicId(publicId);
      if (!targetUser) {
        return NextResponse.json(
          { error: `表示用ID "${publicId}" のユーザーが見つかりません` },
          { status: 404 }
        );
      }
      if (targetUser.id === userId) {
        continue; // 自分自身はスキップ
      }
      if (!participantIds.includes(targetUser.id)) {
        participantIds.push(targetUser.id);
      }
    }

    // 最低2人必要
    if (participantIds.length < 2) {
      return NextResponse.json(
        { error: 'グループチャットには最低2人の参加者が必要です' },
        { status: 400 }
      );
    }

    // グループチャットを作成
    const groupChat = await createGroupChat({
      name,
      description: description || undefined,
      participantIds,
      createdBy: userId!,
    });

    return NextResponse.json({ groupChat }, { status: 201 });
  } catch (error) {
    console.error('Create group chat error:', error);
    return NextResponse.json(
      { error: 'グループチャットの作成に失敗しました' },
      { status: 500 }
    );
  }
}

// グループチャット更新（参加者追加など）
export async function PUT(request: NextRequest) {
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
    const { groupChatId, action, participantPublicId, name, description } = body;

    if (!groupChatId || !action) {
      return NextResponse.json(
        { error: '必須項目が不足しています' },
        { status: 400 }
      );
    }

    const groupChat = await getGroupChatById(groupChatId);
    if (!groupChat) {
      return NextResponse.json(
        { error: 'グループチャットが見つかりません' },
        { status: 404 }
      );
    }

    // 参加者チェック
    if (!groupChat.participantIds.includes(userId!)) {
      return NextResponse.json(
        { error: 'このグループチャットに参加していません' },
        { status: 403 }
      );
    }

    if (action === 'addParticipant') {
      if (!participantPublicId) {
        return NextResponse.json(
          { error: '参加者の表示用IDが必要です' },
          { status: 400 }
        );
      }

      const targetUser = await getUserByPublicId(participantPublicId);
      if (!targetUser) {
        return NextResponse.json(
          { error: 'ユーザーが見つかりません' },
          { status: 404 }
        );
      }

      const updated = await addParticipantToGroupChat(groupChatId, targetUser.id);
      return NextResponse.json({ groupChat: updated }, { status: 200 });
    }

    if (action === 'leave') {
      // 退出処理
      const updated = await removeParticipantFromGroupChat(groupChatId, userId!);
      if (!updated) {
        return NextResponse.json(
          { error: 'グループチャットからの退出に失敗しました' },
          { status: 500 }
        );
      }
      
      // 参加者が1人以下になった場合はグループチャットを削除するか、そのまま残すか
      // ここでは残す方針とする（参加者が0人でもグループチャットは残る）
      
      return NextResponse.json({ groupChat: updated, left: true }, { status: 200 });
    }

    if (action === 'update') {
      const updates: any = {};
      if (name !== undefined) {
        const nameError = validateContent(name);
        if (nameError) {
          return NextResponse.json(
            { error: nameError },
            { status: 400 }
          );
        }
        updates.name = name;
      }
      if (description !== undefined) {
        if (description) {
          const descError = validateContent(description);
          if (descError) {
            return NextResponse.json(
              { error: descError },
              { status: 400 }
            );
          }
        }
        updates.description = description;
      }

      // 作成者のみ更新可能
      if (groupChat.createdBy !== userId) {
        return NextResponse.json(
          { error: 'グループチャットの更新は作成者のみ可能です' },
          { status: 403 }
        );
      }

      const updated = await updateGroupChat(groupChatId, updates);
      return NextResponse.json({ groupChat: updated }, { status: 200 });
    }

    return NextResponse.json(
      { error: '無効なアクションです' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Update group chat error:', error);
    return NextResponse.json(
      { error: 'グループチャットの更新に失敗しました' },
      { status: 500 }
    );
  }
}

