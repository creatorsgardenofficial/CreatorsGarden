import { NextRequest, NextResponse } from 'next/server';
import { bumpEvent } from '@/lib/storage-db-events';
import { shouldUseDatabaseStorage } from '@/lib/storage-common';
import { checkUserActive } from '@/lib/utils';

/**
 * イベントを挙げる（24時間クールタイム）
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

    try {
      const event = await bumpEvent(id, user!.id);
      if (!event) {
        return NextResponse.json(
          { error: 'Event not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({ event });
    } catch (error: any) {
      if (error.message.includes('24時間以内')) {
        return NextResponse.json(
          { error: error.message },
          { status: 429 }
        );
      }
      throw error;
    }
  } catch (error: any) {
    console.error('Failed to bump event:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to bump event' },
      { status: 500 }
    );
  }
}

