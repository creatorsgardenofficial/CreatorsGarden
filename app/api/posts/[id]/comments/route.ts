import { NextRequest, NextResponse } from 'next/server';
import { getCommentsByPostId, createComment, getRecentCommentsByUserId } from '@/lib/storage';
import { getUserById } from '@/lib/storage';
import { validateContent } from '@/lib/contentFilter';

// コメントの最大文字数
const MAX_COMMENT_LENGTH = 500;

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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const comments = await getCommentsByPostId(id);
    return NextResponse.json({ comments }, { status: 200 });
  } catch (error) {
    console.error('Get comments error:', error);
    return NextResponse.json(
      { error: 'コメントの取得に失敗しました' },
      { status: 500 }
    );
  }
}

export async function POST(
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

    const { id } = await params;
    const body = await request.json();
    const { content } = body;

    if (!content) {
      return NextResponse.json(
        { error: 'コメント内容を入力してください' },
        { status: 400 }
      );
    }

    // 文字数制限チェック
    if (content.length > MAX_COMMENT_LENGTH) {
      return NextResponse.json(
        { error: `コメントは${MAX_COMMENT_LENGTH}文字以内で入力してください（現在: ${content.length}文字）` },
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

    // スパム対策: 最近のコメントをチェック（5分以内に同じ内容のコメントがないか）
    const recentComments = await getRecentCommentsByUserId(userId, 5, 10);
    const normalizedNewContent = content.trim().toLowerCase().replace(/\s+/g, ' ');
    
    for (const recentComment of recentComments) {
      const normalizedRecentContent = recentComment.content.trim().toLowerCase().replace(/\s+/g, ' ');
      // 90%以上同じ内容の場合はスパムとみなす
      if (normalizedNewContent.length > 0 && normalizedRecentContent.length > 0) {
        const similarity = calculateSimilarity(normalizedNewContent, normalizedRecentContent);
        if (similarity > 0.9) {
          return NextResponse.json(
            { error: '同じ内容のコメントが短時間で繰り返されています。スパムとみなされました。' },
            { status: 400 }
          );
        }
      }
    }

    // スパム対策: 短時間での大量コメントをチェック（5分以内に10件以上）
    if (recentComments.length >= 10) {
      return NextResponse.json(
        { error: 'コメント頻度が高すぎます。しばらく時間をおいてから再度お試しください。' },
        { status: 429 }
      );
    }

    const comment = await createComment({
      postId: id,
      userId: user.id,
      username: user.username,
      content,
    });

    return NextResponse.json({ comment }, { status: 201 });
  } catch (error) {
    console.error('Create comment error:', error);
    return NextResponse.json(
      { error: 'コメントの作成に失敗しました' },
      { status: 500 }
    );
  }
}

