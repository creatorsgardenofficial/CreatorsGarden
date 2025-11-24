import { NextRequest, NextResponse } from 'next/server';
import { getPosts, createPost, getUserById, getRecentPostsByUserId } from '@/lib/storage';
import { validateContent, validateUrl } from '@/lib/contentFilter';
import { getPlanLimits, canAddTag } from '@/lib/planLimits';

/**
 * 2つの文字列の類似度を計算（レーベンシュタイン距離ベース）
 * @param str1 文字列1
 * @param str2 文字列2
 * @returns 類似度（0-1、1が完全一致）
 */
function calculateSimilarity(str1: string, str2: string): number {
  if (str1 === str2) return 1.0;
  if (str1.length === 0 || str2.length === 0) return 0.0;
  
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1.0;
  
  // 簡易的な類似度計算（最長共通部分列の割合）
  let commonLength = 0;
  const minLength = Math.min(str1.length, str2.length);
  
  for (let i = 0; i < minLength; i++) {
    if (str1[i] === str2[i]) {
      commonLength++;
    }
  }
  
  return commonLength / longer.length;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type');
    const creatorType = searchParams.get('creatorType');
    const tags = searchParams.getAll('tags'); // 複数タグ対応
    const tagMode = searchParams.get('tagMode') || 'and'; // AND/OR検索モード（デフォルトはAND）
    const userId = searchParams.get('userId');
    const status = searchParams.get('status');
    const search = searchParams.get('search'); // ワード検索（タイトル・内容）

    let posts = await getPosts();

    // フィルタリング
    if (userId) {
      posts = posts.filter(p => p.userId === userId);
    }
    if (type) {
      posts = posts.filter(p => p.type === type);
    }
    if (creatorType) {
      posts = posts.filter(p => p.creatorType === creatorType);
    }
    // 複数タグフィルタリング：AND/OR検索モードに対応
    if (tags.length > 0) {
      if (tagMode === 'and') {
        // AND検索：選択されたすべてのタグを含む投稿を表示
        posts = posts.filter(p => {
          return tags.every(tag => p.tags.includes(tag));
        });
      } else {
        // OR検索：選択されたタグのいずれかを含む投稿を表示
        posts = posts.filter(p => {
          return tags.some(tag => p.tags.includes(tag));
        });
      }
    }
    if (status) {
      posts = posts.filter(p => p.status === status);
    }
    // ワード検索（タイトル・内容で部分一致）
    if (search) {
      const searchLower = search.toLowerCase();
      posts = posts.filter(p => 
        p.title?.toLowerCase().includes(searchLower) ||
        p.content?.toLowerCase().includes(searchLower)
      );
    }

    // プランによる優先表示（Grow Plan以上は最上部に）
    // 優先表示の投稿を先に、その後通常の投稿を新しい順にソート
    // 優先表示の投稿同士はランダムにソート
    // 挙げられた投稿（bumpedAt）は最新扱いで上位に表示
    
    // 優先表示の投稿と通常の投稿を分離
    const priorityPosts: typeof posts = [];
    const normalPosts: typeof posts = [];
    
    for (const post of posts) {
      if (post.priorityDisplay) {
        priorityPosts.push(post);
      } else {
        normalPosts.push(post);
      }
    }
    
    // 優先表示の投稿をランダムにシャッフル（Fisher-Yatesアルゴリズム）
    for (let i = priorityPosts.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [priorityPosts[i], priorityPosts[j]] = [priorityPosts[j], priorityPosts[i]];
    }
    
    // 通常の投稿を新しい順にソート（挙げられた投稿は最新扱い）
    normalPosts.sort((a, b) => {
      const dateA = a.bumpedAt ? new Date(a.bumpedAt).getTime() : new Date(a.createdAt).getTime();
      const dateB = b.bumpedAt ? new Date(b.bumpedAt).getTime() : new Date(b.createdAt).getTime();
      return dateB - dateA; // 新しい順（降順）
    });
    
    // 優先表示の投稿を先に、その後通常の投稿を結合
    posts = [...priorityPosts, ...normalPosts];

    return NextResponse.json({ posts }, { status: 200 });
  } catch (error) {
    console.error('Get posts error:', error);
    return NextResponse.json(
      { error: '投稿の取得に失敗しました' },
      { status: 500 }
    );
  }
}

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

    // 利用停止チェック
    if (user.isActive === false) {
      return NextResponse.json(
        { error: 'このアカウントは利用停止されています' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { type, title, content, tags, url, urls } = body;

    if (!type || !title || !content) {
      return NextResponse.json(
        { error: '必須項目が不足しています' },
        { status: 400 }
      );
    }

    // スパム対策: 最近の投稿をチェック（10分以内に同じ内容の投稿がないか）
    const recentPosts = await getRecentPostsByUserId(userId, 10, 5);
    const normalizedNewContent = (title + ' ' + content).trim().toLowerCase().replace(/\s+/g, ' ');
    
    for (const recentPost of recentPosts) {
      const normalizedRecentContent = (recentPost.title + ' ' + recentPost.content).trim().toLowerCase().replace(/\s+/g, ' ');
      // 90%以上同じ内容の場合はスパムとみなす
      if (normalizedNewContent.length > 0 && normalizedRecentContent.length > 0) {
        const similarity = calculateSimilarity(normalizedNewContent, normalizedRecentContent);
        if (similarity > 0.9) {
          return NextResponse.json(
            { error: '同じ内容の投稿が短時間で繰り返されています。スパムとみなされました。' },
            { status: 400 }
          );
        }
      }
    }

    // スパム対策: 短時間での大量投稿をチェック（10分以内に5件以上）
    if (recentPosts.length >= 5) {
      return NextResponse.json(
        { error: '投稿頻度が高すぎます。しばらく時間をおいてから再度お試しください。' },
        { status: 429 }
      );
    }

    // 文字数制限
    const MAX_TITLE_LENGTH = 100;
    const MAX_CONTENT_LENGTH = 1000;
    const MAX_TAG_LENGTH = 30;
    const MAX_TAG_TOTAL_LENGTH = 200;
    const MAX_URL_DESCRIPTION_LENGTH = 100;

    if (title.length > MAX_TITLE_LENGTH) {
      return NextResponse.json(
        { error: `タイトルは${MAX_TITLE_LENGTH}文字以内で入力してください（現在: ${title.length}文字）` },
        { status: 400 }
      );
    }

    if (content.length > MAX_CONTENT_LENGTH) {
      return NextResponse.json(
        { error: `内容は${MAX_CONTENT_LENGTH}文字以内で入力してください（現在: ${content.length}文字）` },
        { status: 400 }
      );
    }

    // コンテンツフィルタリング
    const titleError = validateContent(title);
    if (titleError) {
      return NextResponse.json(
        { error: titleError },
        { status: 400 }
      );
    }

    const contentError = validateContent(content);
    if (contentError) {
      return NextResponse.json(
        { error: contentError },
        { status: 400 }
      );
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

    // URLのバリデーション（複数URL対応、説明付き）
    let validatedUrls: Array<{ url: string; description?: string }> | undefined;
    
    // 新しいurls配列を優先、なければ後方互換性のためurlを使用
    if (urls && Array.isArray(urls) && urls.length > 0) {
      // オブジェクト配列か文字列配列かを判定
      const isObjectArray = typeof urls[0] === 'object' && urls[0] !== null;
      
      let processedUrls: Array<{ url: string; description?: string }> = [];
      
      if (isObjectArray) {
        // 新しい形式（オブジェクト配列）
        // URL説明の文字数チェック
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
    } else if (url && url.trim().length > 0) {
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

    const post = await createPost({
      userId: user.id,
      username: user.username,
      creatorType: user.creatorType,
      type,
      title,
      content,
      tags: tags || [],
      urls: validatedUrls,
      status: 'open', // デフォルトでopen
    });

    return NextResponse.json({ post }, { status: 201 });
  } catch (error) {
    console.error('Create post error:', error);
    return NextResponse.json(
      { error: '投稿の作成に失敗しました' },
      { status: 500 }
    );
  }
}

