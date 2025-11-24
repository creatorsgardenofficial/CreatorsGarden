import { NextRequest, NextResponse } from 'next/server';
import { getUserById } from '@/lib/storage';
import {
  blockUser,
  unblockUser,
  isUserBlocked,
  getBlockedUserIds,
} from '@/lib/storage';
import { checkUserActive } from '@/lib/utils';

// ブロック状態の取得
export async function GET(request: NextRequest) {
  try {
    const userId = request.cookies.get('userId')?.value;
    const { active } = await checkUserActive(userId);

    if (!active) {
      return NextResponse.json(
        { error: 'ログインが必要です' },
        { status: 401 }
      );
    }

    const url = new URL(request.url);
    const targetUserId = url.searchParams.get('userId');

    if (!targetUserId) {
      // ブロックリスト全体を取得
      const blockedUserIds = await getBlockedUserIds(userId!);
      return NextResponse.json({ blockedUserIds }, { status: 200 });
    }

    // 特定ユーザーのブロック状態を取得
    const blocked = await isUserBlocked(userId!, targetUserId);
    return NextResponse.json({ blocked }, { status: 200 });
  } catch (error) {
    console.error('Get block status error:', error);
    return NextResponse.json(
      { error: 'ブロック状態の取得に失敗しました' },
      { status: 500 }
    );
  }
}

// ユーザーをブロック
export async function POST(request: NextRequest) {
  try {
    const userId = request.cookies.get('userId')?.value;
    const { active } = await checkUserActive(userId);

    if (!active) {
      return NextResponse.json(
        { error: 'ログインが必要です' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { blockedUserId } = body;

    if (!blockedUserId) {
      return NextResponse.json(
        { error: 'ブロックするユーザーIDが必要です' },
        { status: 400 }
      );
    }

    // 自分自身をブロックすることはできない
    if (userId === blockedUserId) {
      return NextResponse.json(
        { error: '自分自身をブロックすることはできません' },
        { status: 400 }
      );
    }

    // ブロック対象のユーザーが存在するか確認
    const blockedUser = await getUserById(blockedUserId);
    if (!blockedUser) {
      return NextResponse.json(
        { error: 'ユーザーが見つかりません' },
        { status: 404 }
      );
    }

    await blockUser(userId!, blockedUserId);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Block user error:', error);
    return NextResponse.json(
      { error: 'ユーザーのブロックに失敗しました' },
      { status: 500 }
    );
  }
}

// ユーザーのブロックを解除
export async function DELETE(request: NextRequest) {
  try {
    const userId = request.cookies.get('userId')?.value;
    const { active } = await checkUserActive(userId);

    if (!active) {
      return NextResponse.json(
        { error: 'ログインが必要です' },
        { status: 401 }
      );
    }

    const url = new URL(request.url);
    const blockedUserId = url.searchParams.get('userId');

    if (!blockedUserId) {
      return NextResponse.json(
        { error: 'ブロック解除するユーザーIDが必要です' },
        { status: 400 }
      );
    }

    await unblockUser(userId!, blockedUserId);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Unblock user error:', error);
    return NextResponse.json(
      { error: 'ユーザーのブロック解除に失敗しました' },
      { status: 500 }
    );
  }
}

