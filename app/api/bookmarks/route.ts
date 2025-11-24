import { NextRequest, NextResponse } from 'next/server';
import { 
  createBookmark, 
  deleteBookmark, 
  getBookmarksByUserId, 
  getBookmarkCount,
  getBookmarkedPostIds,
  getPosts,
  getUserById
} from '@/lib/storage';
import { canAddBookmark, getPlanLimits } from '@/lib/planLimits';

// ブックマーク一覧取得
export async function GET(request: NextRequest) {
  try {
    const userId = request.cookies.get('userId')?.value;

    if (!userId) {
      return NextResponse.json(
        { error: 'ログインが必要です' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const postIds = searchParams.get('postIds') === 'true';

    if (postIds) {
      // ブックマークした投稿IDの配列を返す
      const postIds = await getBookmarkedPostIds(userId);
      return NextResponse.json({ postIds }, { status: 200 });
    }

    // ブックマーク一覧を取得
    const bookmarks = await getBookmarksByUserId(userId);
    
    // 投稿情報も含めて返す
    const posts = await getPosts();
    const bookmarkedPosts = bookmarks
      .map(bookmark => {
        const post = posts.find(p => p.id === bookmark.postId);
        return post ? { ...bookmark, post } : null;
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({ bookmarks: bookmarkedPosts }, { status: 200 });
  } catch (error) {
    console.error('Get bookmarks error:', error);
    return NextResponse.json(
      { error: 'ブックマークの取得に失敗しました' },
      { status: 500 }
    );
  }
}

// ブックマーク追加
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { postId } = body;

    if (!postId) {
      return NextResponse.json(
        { error: '投稿IDが必要です' },
        { status: 400 }
      );
    }

    // プラン制限のチェック
    const planType = user.subscription?.planType || 'free';
    const currentBookmarkCount = await getBookmarkCount(userId);
    
    if (!canAddBookmark(currentBookmarkCount, planType)) {
      const limits = getPlanLimits(planType);
      return NextResponse.json(
        { 
          error: `ブックマークの上限に達しています。現在のプラン: ${planType === 'free' ? 'Free Plan' : planType === 'grow' ? 'Grow Plan' : 'Bloom Plan'}。プランをアップグレードするには、プランページをご覧ください。`,
          planLimit: true,
          maxBookmarks: limits.maxBookmarks,
        },
        { status: 403 }
      );
    }

    const bookmark = await createBookmark(userId, postId);
    return NextResponse.json({ bookmark }, { status: 201 });
  } catch (error) {
    console.error('Create bookmark error:', error);
    return NextResponse.json(
      { error: 'ブックマークの追加に失敗しました' },
      { status: 500 }
    );
  }
}

// ブックマーク削除
export async function DELETE(request: NextRequest) {
  try {
    const userId = request.cookies.get('userId')?.value;

    if (!userId) {
      return NextResponse.json(
        { error: 'ログインが必要です' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const postId = searchParams.get('postId');

    if (!postId) {
      return NextResponse.json(
        { error: '投稿IDが必要です' },
        { status: 400 }
      );
    }

    const deleted = await deleteBookmark(userId, postId);
    
    if (!deleted) {
      return NextResponse.json(
        { error: 'ブックマークが見つかりません' },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: 'ブックマークを削除しました' }, { status: 200 });
  } catch (error) {
    console.error('Delete bookmark error:', error);
    return NextResponse.json(
      { error: 'ブックマークの削除に失敗しました' },
      { status: 500 }
    );
  }
}

