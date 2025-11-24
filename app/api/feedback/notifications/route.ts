import { NextRequest, NextResponse } from 'next/server';
import { getFeedbacks, getUserById } from '@/lib/storage';
import { isAdmin } from '@/lib/admin';

// 通知数を取得（管理者：未返信のフィードバック数、ユーザー：未読の返信があるフィードバック数）
export async function GET(request: NextRequest) {
  try {
    const userId = request.cookies.get('userId')?.value;

    if (!userId) {
      return NextResponse.json(
        { count: 0 },
        { status: 200 }
      );
    }

    const user = await getUserById(userId);
    if (!user) {
      return NextResponse.json(
        { count: 0 },
        { status: 200 }
      );
    }

    // 利用停止チェック
    if (user.isActive === false) {
      return NextResponse.json(
        { count: 0 },
        { status: 200 }
      );
    }

    const allFeedbacks = await getFeedbacks();

    // 管理者の場合：未返信のフィードバック数（メッセージがない、または最後のメッセージがユーザーからのもの）
    if (isAdmin(user.email)) {
      const unreadCount = allFeedbacks.filter(f => {
        if (f.messages && f.messages.length > 0) {
          // 最後のメッセージがユーザーからのもの（管理者が返信すべき）
          const lastMessage = f.messages[f.messages.length - 1];
          return lastMessage.senderType === 'user';
        }
        // メッセージ配列がない場合、replyフィールドで判定
        return !f.reply;
      }).length;
      return NextResponse.json({ count: unreadCount }, { status: 200 });
    }

    // ユーザーの場合：未読の返信があるフィードバック数
    // ローカルストレージから既読状態を取得する必要があるが、サーバー側では取得できないため、
    // 返信があるフィードバック数を返す（クライアント側で既読状態を考慮してフィルタリング）
    const myFeedbacks = allFeedbacks.filter(f => 
      f.userId === userId || f.email === user.email
    );
    const repliedFeedbacks = myFeedbacks.filter(f => {
      if (f.messages && f.messages.length > 0) {
        // 管理者からのメッセージがあるかチェック
        return f.messages.some(m => m.senderType === 'admin');
      }
      // メッセージ配列がない場合、replyフィールドで判定
      return !!f.reply;
    });
    
    return NextResponse.json({ count: repliedFeedbacks.length }, { status: 200 });
  } catch (error) {
    console.error('Get feedback notifications error:', error);
    return NextResponse.json(
      { count: 0 },
      { status: 500 }
    );
  }
}

