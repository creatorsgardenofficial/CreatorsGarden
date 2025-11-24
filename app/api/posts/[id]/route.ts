import { NextRequest, NextResponse } from 'next/server';
import { getPostById, updatePost, deletePost, adminDeletePost, getUserById } from '@/lib/storage';
import { validateContent, validateUrl } from '@/lib/contentFilter';
import { logSecurityEvent } from '@/lib/securityLog';
import { getPlanLimits } from '@/lib/planLimits';
import { getClientIp } from '@/lib/utils';
import { isAdmin } from '@/lib/admin';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const post = await getPostById(id);

    if (!post) {
      return NextResponse.json(
        { error: '投稿が見つかりません' },
        { status: 404 }
      );
    }

    return NextResponse.json({ post }, { status: 200 });
  } catch (error) {
    console.error('Get post error:', error);
    return NextResponse.json(
      { error: '投稿の取得に失敗しました' },
      { status: 500 }
    );
  }
}

export async function PUT(
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

    const { id } = await params;
    const post = await getPostById(id);

    if (!post) {
      return NextResponse.json(
        { error: '投稿が見つかりません' },
        { status: 404 }
      );
    }

    if (post.userId !== userId) {
      return NextResponse.json(
        { error: '権限がありません' },
        { status: 403 }
      );
    }

    // 利用停止チェック
    const user = await getUserById(userId);
    if (user && user.isActive === false) {
      return NextResponse.json(
        { error: 'このアカウントは利用停止されています' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { title, content, tags, status, url, urls } = body;

    // ステータスのバリデーション
    if (status && status !== 'open' && status !== 'closed') {
      return NextResponse.json(
        { error: '無効なステータスです' },
        { status: 400 }
      );
    }

    // 文字数制限
    const MAX_TITLE_LENGTH = 100;
    const MAX_CONTENT_LENGTH = 1000;
    const MAX_TAG_LENGTH = 30;
    const MAX_TAG_TOTAL_LENGTH = 200;
    const MAX_URL_DESCRIPTION_LENGTH = 100;

    if (title && title.length > MAX_TITLE_LENGTH) {
      return NextResponse.json(
        { error: `タイトルは${MAX_TITLE_LENGTH}文字以内で入力してください（現在: ${title.length}文字）` },
        { status: 400 }
      );
    }

    if (content && content.length > MAX_CONTENT_LENGTH) {
      return NextResponse.json(
        { error: `内容は${MAX_CONTENT_LENGTH}文字以内で入力してください（現在: ${content.length}文字）` },
        { status: 400 }
      );
    }

    // コンテンツフィルタリング
    if (title) {
      const titleError = validateContent(title);
      if (titleError) {
        return NextResponse.json(
          { error: titleError },
          { status: 400 }
        );
      }
    }

    if (content) {
      const contentError = validateContent(content);
      if (contentError) {
        return NextResponse.json(
          { error: contentError },
          { status: 400 }
        );
      }
    }

    // タグのフィルタリング
    if (tags && Array.isArray(tags)) {
      for (const tag of tags) {
        if (tag.length > MAX_TAG_LENGTH) {
          return NextResponse.json(
            { error: `各タグは${MAX_TAG_LENGTH}文字以内で入力してください（「${tag}」は${tag.length}文字）` },
            { status: 400 }
          );
        }
        const tagError = validateContent(tag);
        if (tagError) {
          return NextResponse.json(
            { error: tagError },
            { status: 400 }
          );
        }
      }
      
      // プランによるタグ数の制限チェック
      if (user) {
        const planType = user.subscription?.planType || 'free';
        const limits = getPlanLimits(planType);
        if (tags.length > limits.maxTags) {
          return NextResponse.json(
            { 
              error: `タグは${limits.maxTags}個までです。現在のプラン: ${planType === 'free' ? 'Free Plan' : planType === 'grow' ? 'Grow Plan' : 'Bloom Plan'}`,
              planLimit: true,
              maxTags: limits.maxTags,
            },
            { status: 403 }
          );
        }
      }
    }

    // URLのバリデーション（複数URL対応、説明付き）
    let validatedUrls: Array<{ url: string; description?: string }> | undefined;
    
    // 新しいurls配列を優先、なければ後方互換性のためurlを使用
    if (urls && Array.isArray(urls) && urls.length > 0) {
      // オブジェクト配列か文字列配列かを判定
      const isObjectArray = typeof urls[0] === 'object' && urls[0] !== null;
      
      let processedUrls: Array<{ url: string; description?: string }> = [];
      
      if (isObjectArray) {
        // 新しい形式（オブジェクト配列）
        for (const item of urls as Array<{ url: string; description?: string }>) {
          if (item.description && item.description.length > MAX_URL_DESCRIPTION_LENGTH) {
            return NextResponse.json(
              { error: `URL説明は${MAX_URL_DESCRIPTION_LENGTH}文字以内で入力してください（現在: ${item.description.length}文字）` },
              { status: 400 }
            );
          }
        }
        processedUrls = (urls as Array<{ url: string; description?: string }>)
          .filter((item: any) => item.url && item.url.trim().length > 0)
          .map((item: any) => ({
            url: item.url.trim(),
            description: item.description?.trim() || undefined,
          }));
      } else {
        // 古い形式（文字列配列）
        processedUrls = (urls as string[])
          .filter((u: string) => u && u.trim().length > 0)
          .map((u: string) => ({ url: u.trim() }));
      }
      
      // 最大3つまで
      if (processedUrls.length > 3) {
        return NextResponse.json(
          { error: 'URLは最大3つまでです' },
          { status: 400 }
        );
      }
      
      // 各URLを検証
      for (const urlItem of processedUrls) {
        const urlError = validateUrl(urlItem.url);
        if (urlError) {
          return NextResponse.json(
            { error: urlError },
            { status: 400 }
          );
        }
      }
      
      validatedUrls = processedUrls.length > 0 ? processedUrls : undefined;
    } else if (url !== undefined && url !== null && url.trim().length > 0) {
      // 後方互換性: 単一のurlフィールドがある場合
      const urlError = validateUrl(url);
      if (urlError) {
        return NextResponse.json(
          { error: urlError },
          { status: 400 }
        );
      }
      validatedUrls = [{ url: url.trim() }];
    }

    // validatedUrlsをbodyに設定
    if (validatedUrls !== undefined) {
      body.urls = validatedUrls;
      // 後方互換性のため、urlフィールドは削除（urlsを使用）
      delete body.url;
    } else {
      // urlsが空の場合はundefinedに設定
      body.urls = undefined;
      delete body.url;
    }

    const updatedPost = await updatePost(id, body);

    return NextResponse.json({ post: updatedPost }, { status: 200 });
  } catch (error) {
    console.error('Update post error:', error);
    return NextResponse.json(
      { error: '投稿の更新に失敗しました' },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    const { id } = await params;
    const post = await getPostById(id);

    if (!post) {
      return NextResponse.json(
        { error: '投稿が見つかりません' },
        { status: 404 }
      );
    }

    // 利用停止チェック
    const user = await getUserById(userId);
    if (user && user.isActive === false) {
      return NextResponse.json(
        { error: 'このアカウントは利用停止されています' },
        { status: 403 }
      );
    }

    // 管理者チェック
    const isUserAdmin = user && isAdmin(user.email);
    
    // 所有者または管理者のみ削除可能
    if (post.userId !== userId && !isUserAdmin) {
      // 不正アクセス試行を記録（管理者でない場合のみ）
      const ip = getClientIp(request);
      const userAgent = request.headers.get('user-agent') || 'unknown';
      await logSecurityEvent('unauthorized_access', {
        userId,
        ip,
        userAgent,
        details: { path: `/api/posts/${id}`, method: 'DELETE', postOwnerId: post.userId },
        severity: 'high',
      });
      
      return NextResponse.json(
        { error: '権限がありません' },
        { status: 403 }
      );
    }

    // 管理者の場合はメッセージを残す削除、通常ユーザーの場合は完全削除
    if (isUserAdmin && post.userId !== userId) {
      await adminDeletePost(id);
      return NextResponse.json({ message: '投稿を管理者により削除しました' }, { status: 200 });
    } else {
      await deletePost(id);
      return NextResponse.json({ message: '投稿を削除しました' }, { status: 200 });
    }
  } catch (error) {
    console.error('Delete post error:', error);
    return NextResponse.json(
      { error: '投稿の削除に失敗しました' },
      { status: 500 }
    );
  }
}

