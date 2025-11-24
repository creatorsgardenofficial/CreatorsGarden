import { NextRequest, NextResponse } from 'next/server';
import { getPostById, updatePost, getPosts, savePosts } from '@/lib/storage';
import { getUserById, updateUser } from '@/lib/storage';

/**
 * 投稿を挙げる（24時間に1回まで）
 * 挙げられた投稿は投稿一覧の上位（最新扱い）に再配置される
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = request.cookies.get('userId')?.value;

    if (!userId) {
      return NextResponse.json(
        { error: 'ログインが必要です' },
        { status: 401 }
      );
    }

    // 投稿を取得
    const post = await getPostById(id);
    if (!post) {
      return NextResponse.json(
        { error: '投稿が見つかりません' },
        { status: 404 }
      );
    }

    // 自分の投稿のみ挙げられる
    if (post.userId !== userId) {
      return NextResponse.json(
        { error: '自分の投稿のみ挙げられます' },
        { status: 403 }
      );
    }

    // ユーザー情報を取得
    const user = await getUserById(userId);
    if (!user) {
      return NextResponse.json(
        { error: 'ユーザーが見つかりません' },
        { status: 404 }
      );
    }

    // 24時間クールタイムチェック
    if (user.lastBumpAt) {
      const lastBumpTime = new Date(user.lastBumpAt).getTime();
      const now = Date.now();
      const cooldownMs = 24 * 60 * 60 * 1000; // 24時間（ミリ秒）
      const timeRemaining = cooldownMs - (now - lastBumpTime);

      if (timeRemaining > 0) {
        // クールタイム中
        const hoursRemaining = Math.floor(timeRemaining / (60 * 60 * 1000));
        const minutesRemaining = Math.floor((timeRemaining % (60 * 60 * 1000)) / (60 * 1000));
        const nextBumpTime = new Date(lastBumpTime + cooldownMs);
        
        return NextResponse.json(
          { 
            error: '24時間に1回までしか挙げられません',
            nextBumpAt: nextBumpTime.toISOString(),
            hoursRemaining,
            minutesRemaining,
          },
          { status: 429 } // Too Many Requests
        );
      }
    }

    // 投稿を挙げる（bumpedAtを現在時刻に更新）
    const now = new Date().toISOString();
    const updatedPost = await updatePost(id, {
      bumpedAt: now,
      updatedAt: now,
    });

    if (!updatedPost) {
      return NextResponse.json(
        { error: '投稿の更新に失敗しました' },
        { status: 500 }
      );
    }

    // ユーザーのlastBumpAtを更新
    await updateUser(userId, {
      lastBumpAt: now,
    });

    console.log('Bump: 投稿を挙げました', {
      postId: id,
      userId,
      bumpedAt: now,
    });

    return NextResponse.json({
      success: true,
      message: '投稿を挙げました',
      bumpedAt: now,
      post: updatedPost,
    }, { status: 200 });

  } catch (error) {
    console.error('Bump post error:', error);
    return NextResponse.json(
      { error: '投稿の挙げに失敗しました' },
      { status: 500 }
    );
  }
}

/**
 * 挙げ機能の状態を取得（クールタイム情報など）
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = request.cookies.get('userId')?.value;

    if (!userId) {
      return NextResponse.json(
        { error: 'ログインが必要です' },
        { status: 401 }
      );
    }

    // 投稿を取得
    const post = await getPostById(id);
    if (!post) {
      return NextResponse.json(
        { error: '投稿が見つかりません' },
        { status: 404 }
      );
    }

    // 自分の投稿のみ確認可能
    if (post.userId !== userId) {
      return NextResponse.json(
        { error: '自分の投稿のみ確認できます' },
        { status: 403 }
      );
    }

    // ユーザー情報を取得
    const user = await getUserById(userId);
    if (!user) {
      return NextResponse.json(
        { error: 'ユーザーが見つかりません' },
        { status: 404 }
      );
    }

    // クールタイム情報を計算
    let canBump = true;
    let nextBumpAt: string | null = null;
    let hoursRemaining = 0;
    let minutesRemaining = 0;

    if (user.lastBumpAt) {
      const lastBumpTime = new Date(user.lastBumpAt).getTime();
      const now = Date.now();
      const cooldownMs = 24 * 60 * 60 * 1000; // 24時間（ミリ秒）
      const timeRemaining = cooldownMs - (now - lastBumpTime);

      if (timeRemaining > 0) {
        canBump = false;
        const nextBumpTime = new Date(lastBumpTime + cooldownMs);
        nextBumpAt = nextBumpTime.toISOString();
        hoursRemaining = Math.floor(timeRemaining / (60 * 60 * 1000));
        minutesRemaining = Math.floor((timeRemaining % (60 * 60 * 1000)) / (60 * 1000));
      }
    }

    return NextResponse.json({
      canBump,
      nextBumpAt,
      hoursRemaining,
      minutesRemaining,
      lastBumpAt: user.lastBumpAt,
      postBumpedAt: post.bumpedAt,
    }, { status: 200 });

  } catch (error) {
    console.error('Get bump status error:', error);
    return NextResponse.json(
      { error: '挙げ機能の状態取得に失敗しました' },
      { status: 500 }
    );
  }
}

