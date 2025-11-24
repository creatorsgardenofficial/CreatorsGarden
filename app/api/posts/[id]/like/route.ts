import { NextRequest, NextResponse } from 'next/server';
import { getPostById, togglePostLike } from '@/lib/storage';
import { getUserById } from '@/lib/storage';

// セッションIDを生成または取得
function getSessionId(request: NextRequest): string {
  // クッキーからセッションIDを取得
  let sessionId = request.cookies.get('sessionId')?.value;
  
  if (!sessionId) {
    // セッションIDがなければ生成
    sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  return sessionId;
}

// いいねの追加/削除
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = request.cookies.get('userId')?.value;
    
    // ログインユーザーの場合はユーザーID、未ログインの場合はセッションIDを使用
    let identifier: string;
    if (userId) {
      const user = await getUserById(userId);
      if (user && user.isActive !== false) {
        identifier = userId;
      } else {
        // 利用停止されている場合はセッションIDを使用
        identifier = getSessionId(request);
      }
    } else {
      identifier = getSessionId(request);
    }
    
    // 投稿を取得
    const post = await getPostById(id);
    if (!post) {
      return NextResponse.json(
        { error: '投稿が見つかりません' },
        { status: 404 }
      );
    }
    
    // いいねをトグル
    const updatedPost = await togglePostLike(id, identifier);
    if (!updatedPost) {
      return NextResponse.json(
        { error: 'いいねの更新に失敗しました' },
        { status: 500 }
      );
    }
    
    // セッションIDをクッキーに保存（未ログインユーザー用）
    const response = NextResponse.json(
      { 
        post: updatedPost,
        isLiked: updatedPost.likes.includes(identifier),
        likesCount: updatedPost.likes.length
      },
      { status: 200 }
    );
    
    if (!userId) {
      // 未ログインユーザーの場合、セッションIDをクッキーに保存（30日間有効）
      response.cookies.set('sessionId', identifier, {
        maxAge: 30 * 24 * 60 * 60, // 30日
        httpOnly: false, // クライアント側でもアクセス可能
        sameSite: 'lax',
      });
    }
    
    return response;
  } catch (error) {
    console.error('Toggle like error:', error);
    return NextResponse.json(
      { error: 'いいねの更新に失敗しました' },
      { status: 500 }
    );
  }
}

// いいね状態の取得
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = request.cookies.get('userId')?.value;
    const sessionId = request.cookies.get('sessionId')?.value;
    
    const post = await getPostById(id);
    if (!post) {
      return NextResponse.json(
        { error: '投稿が見つかりません' },
        { status: 404 }
      );
    }
    
    // ログインユーザーの場合はユーザーID、未ログインの場合はセッションIDを使用
    const identifier = userId || sessionId || '';
    const isLiked = identifier ? post.likes.includes(identifier) : false;
    
    return NextResponse.json({
      isLiked,
      likesCount: post.likes.length,
    }, { status: 200 });
  } catch (error) {
    console.error('Get like status error:', error);
    return NextResponse.json(
      { error: 'いいね状態の取得に失敗しました' },
      { status: 500 }
    );
  }
}

