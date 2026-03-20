import { NextRequest, NextResponse } from 'next/server';
import { getEventComments, createEventComment } from '@/lib/storage-db-events';
import { shouldUseDatabaseStorage } from '@/lib/storage-common';
import { validateContent } from '@/lib/contentFilter';
import { checkUserActive } from '@/lib/utils';

/**
 * イベントのコメント一覧を取得
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const useDatabase = await shouldUseDatabaseStorage();
    if (!useDatabase) {
      return NextResponse.json(
        { error: 'Database storage is not available' },
        { status: 503 }
      );
    }

    const comments = await getEventComments(id);
    return NextResponse.json({ comments });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to get event comments' },
      { status: 500 }
    );
  }
}

/**
 * イベントにコメントを追加
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const useDatabase = await shouldUseDatabaseStorage();
    if (!useDatabase) {
      return NextResponse.json(
        { error: 'Database storage is not available' },
        { status: 503 }
      );
    }

    const userId = request.cookies.get('userId')?.value;
    const { active, user } = await checkUserActive(userId);

    if (!active) {
      return NextResponse.json(
        { error: 'ログインが必要です' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { content } = body;

    if (!content || !content.trim()) {
      return NextResponse.json(
        { error: 'コメント内容を入力してください' },
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

    const comment = await createEventComment({
      eventId: id,
      userId: user!.id,
      content: content.trim(),
    });

    return NextResponse.json({ comment }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to create event comment' },
      { status: 500 }
    );
  }
}

