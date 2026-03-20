import { NextRequest, NextResponse } from 'next/server';
import { deleteEventComment } from '@/lib/storage-db-events';
import { shouldUseDatabaseStorage } from '@/lib/storage-common';
import { checkUserActive } from '@/lib/utils';

/**
 * イベントのコメントを削除
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  const { commentId } = await params;
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

    const deleted = await deleteEventComment(commentId, user!.id);
    if (!deleted) {
      return NextResponse.json(
        { error: 'コメントが見つからないか、削除する権限がありません' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to delete event comment' },
      { status: 500 }
    );
  }
}

