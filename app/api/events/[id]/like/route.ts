import { NextRequest, NextResponse } from 'next/server';
import { toggleEventLike } from '@/lib/storage-db-events';
import { shouldUseDatabaseStorage } from '@/lib/storage-common';
import { checkUserActive } from '@/lib/utils';

/**
 * イベントのイイねをトグル
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

    const event = await toggleEventLike(id, user!.id);
    if (!event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ event });
  } catch (error: any) {
    console.error('Failed to toggle event like:', error);
    return NextResponse.json(
      { error: 'Failed to toggle event like' },
      { status: 500 }
    );
  }
}

