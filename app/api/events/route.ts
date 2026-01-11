import { NextRequest, NextResponse } from 'next/server';
import { getEvents, createEvent, closeExpiredEvents } from '@/lib/storage-db-events';
import { shouldUseDatabaseStorage } from '@/lib/storage-common';
import { validateContent, validateUrl } from '@/lib/contentFilter';
import { checkUserActive } from '@/lib/utils';

/**
 * イベント一覧を取得
 */
export async function GET(request: NextRequest) {
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

    const events = await getEvents();
    return NextResponse.json({ events });
  } catch (error: any) {
    console.error('Failed to get events:', error);
    return NextResponse.json(
      { error: 'Failed to get events' },
      { status: 500 }
    );
  }
}

/**
 * イベントを作成
 */
export async function POST(request: NextRequest) {
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
    const { name, content, startDate, endDate, urls } = body;

    // バリデーション
    if (!name || !content || !startDate || !endDate) {
      return NextResponse.json(
        { error: '必須項目が不足しています' },
        { status: 400 }
      );
    }

    // 日付のバリデーション
    const start = new Date(startDate);
    const end = new Date(endDate);
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

    // コンテンツフィルタリング
    const nameError = validateContent(name);
    if (nameError) {
      return NextResponse.json(
        { error: nameError },
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

    // URLのバリデーション（最大3つまで）
    if (urls && Array.isArray(urls)) {
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

    // イベントを作成（プランに関係なく誰でも作成可能）
    const event = await createEvent({
      userId: user!.id,
      name,
      content,
      startDate,
      endDate,
      status: 'open',
      urls: urls || [],
    });

    return NextResponse.json({ event }, { status: 201 });
  } catch (error: any) {
    console.error('Failed to create event:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create event' },
      { status: 500 }
    );
  }
}

