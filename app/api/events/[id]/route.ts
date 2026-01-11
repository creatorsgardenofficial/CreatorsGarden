import { NextRequest, NextResponse } from 'next/server';
import { getEventById, updateEvent, deleteEvent, closeExpiredEvents } from '@/lib/storage-db-events';
import { shouldUseDatabaseStorage } from '@/lib/storage-common';
import { validateContent, validateUrl } from '@/lib/contentFilter';
import { checkUserActive } from '@/lib/utils';

/**
 * イベントを取得
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

    // 開催期間が終了したイベントのステータスを自動的にcloseに変更
    await closeExpiredEvents();

    const event = await getEventById(id);
    if (!event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ event });
  } catch (error: any) {
    console.error('Failed to get event:', error);
    return NextResponse.json(
      { error: 'Failed to get event' },
      { status: 500 }
    );
  }
}

/**
 * イベントを更新
 */
export async function PUT(
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

    const event = await getEventById(id);
    if (!event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    // 投稿者のみ編集可能
    if (event.userId !== user!.id) {
      return NextResponse.json(
        { error: 'このイベントを編集する権限がありません' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, content, startDate, endDate, urls, status } = body;

    // バリデーション
    if (name !== undefined) {
      const nameError = validateContent(name);
      if (nameError) {
        return NextResponse.json(
          { error: nameError },
          { status: 400 }
        );
      }
    }

    if (content !== undefined) {
      const contentError = validateContent(content);
      if (contentError) {
        return NextResponse.json(
          { error: contentError },
          { status: 400 }
        );
      }
    }

    // 日付のバリデーション
    if (startDate !== undefined || endDate !== undefined) {
      const start = startDate ? new Date(startDate) : new Date(event.startDate);
      const end = endDate ? new Date(endDate) : new Date(event.endDate);
      
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return NextResponse.json(
          { error: '無効な日付です' },
          { status: 400 }
        );
      }

      if (start > end) {
        return NextResponse.json(
          { error: '開始日は終了日より前である必要があります' },
          { status: 400 }
        );
      }
    }

    // URLのバリデーション（最大3つまで）
    if (urls !== undefined && Array.isArray(urls)) {
      if (urls.length > 3) {
        return NextResponse.json(
          { error: 'URLは最大3つまでです' },
          { status: 400 }
        );
      }

      for (const urlData of urls) {
        if (urlData.url) {
          const urlError = validateUrl(urlData.url);
          if (urlError) {
            return NextResponse.json(
              { error: urlError },
              { status: 400 }
            );
          }
        }
      }
    }

    const updatedEvent = await updateEvent(id, {
      name,
      content,
      startDate,
      endDate,
      urls,
      status,
    });

    if (!updatedEvent) {
      return NextResponse.json(
        { error: 'Failed to update event' },
        { status: 500 }
      );
    }

    return NextResponse.json({ event: updatedEvent });
  } catch (error: any) {
    console.error('Failed to update event:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update event' },
      { status: 500 }
    );
  }
}

/**
 * イベントを削除
 */
export async function DELETE(
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

    const event = await getEventById(id);
    if (!event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    // 投稿者のみ削除可能
    if (event.userId !== user!.id) {
      return NextResponse.json(
        { error: 'このイベントを削除する権限がありません' },
        { status: 403 }
      );
    }

    const deleted = await deleteEvent(id, user!.id);
    if (!deleted) {
      return NextResponse.json(
        { error: 'Failed to delete event' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Failed to delete event:', error);
    return NextResponse.json(
      { error: 'Failed to delete event' },
      { status: 500 }
    );
  }
}

