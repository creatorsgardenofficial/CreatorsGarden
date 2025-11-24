import { NextRequest, NextResponse } from 'next/server';
import { getAnnouncements, getVisibleAnnouncements, createAnnouncement, updateAnnouncement, deleteAnnouncement } from '@/lib/storage';
import { getUserById } from '@/lib/storage';
import { isAdmin } from '@/lib/admin';

// 公開用のお知らせ取得（全ユーザーがアクセス可能）
export async function GET(request: NextRequest) {
  try {
    const visibleOnly = request.nextUrl.searchParams.get('visibleOnly') === 'true';
    
    if (visibleOnly) {
      // 表示可能なお知らせのみ取得（投稿一覧用）
      const announcements = await getVisibleAnnouncements();
      return NextResponse.json({ announcements });
    } else {
      // 管理者用：すべてのお知らせを取得
      const userId = request.cookies.get('userId')?.value;
      if (!userId) {
        return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 });
      }
      
      const user = await getUserById(userId);
      if (!user || !isAdmin(user.email)) {
        return NextResponse.json({ error: '管理者権限が必要です' }, { status: 403 });
      }
      
      const announcements = await getAnnouncements();
      return NextResponse.json({ announcements });
    }
  } catch (error: any) {
    console.error('Failed to fetch announcements:', error);
    return NextResponse.json(
      { error: 'お知らせの取得に失敗しました' },
      { status: 500 }
    );
  }
}

// お知らせ作成（管理者のみ）
export async function POST(request: NextRequest) {
  try {
    const userId = request.cookies.get('userId')?.value;
    if (!userId) {
      return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 });
    }
    
    const user = await getUserById(userId);
    if (!user || !isAdmin(user.email)) {
      return NextResponse.json({ error: '管理者権限が必要です' }, { status: 403 });
    }
    
    const body = await request.json();
    const { title, content, type, isVisible, publishedAt, expiresAt } = body;
    
    if (!title || !content) {
      return NextResponse.json(
        { error: 'タイトルと内容は必須です' },
        { status: 400 }
      );
    }
    
    const announcement = await createAnnouncement({
      title,
      content,
      type: type || 'info',
      isVisible: isVisible !== undefined ? isVisible : true,
      publishedAt: publishedAt || undefined,
      expiresAt: expiresAt || undefined,
      createdBy: userId,
    });
    
    return NextResponse.json({ announcement }, { status: 201 });
  } catch (error: any) {
    console.error('Failed to create announcement:', error);
    return NextResponse.json(
      { error: 'お知らせの作成に失敗しました' },
      { status: 500 }
    );
  }
}

// お知らせ更新（管理者のみ）
export async function PUT(request: NextRequest) {
  try {
    const userId = request.cookies.get('userId')?.value;
    if (!userId) {
      return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 });
    }
    
    const user = await getUserById(userId);
    if (!user || !isAdmin(user.email)) {
      return NextResponse.json({ error: '管理者権限が必要です' }, { status: 403 });
    }
    
    const body = await request.json();
    const { id, title, content, type, isVisible, publishedAt, expiresAt } = body;
    
    if (!id) {
      return NextResponse.json(
        { error: 'お知らせIDは必須です' },
        { status: 400 }
      );
    }
    
    const updates: any = {};
    if (title !== undefined) updates.title = title;
    if (content !== undefined) updates.content = content;
    if (type !== undefined) updates.type = type;
    if (isVisible !== undefined) updates.isVisible = isVisible;
    if (publishedAt !== undefined) updates.publishedAt = publishedAt || null;
    if (expiresAt !== undefined) updates.expiresAt = expiresAt || null;
    
    const announcement = await updateAnnouncement(id, updates);
    
    if (!announcement) {
      return NextResponse.json(
        { error: 'お知らせが見つかりません' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ announcement });
  } catch (error: any) {
    console.error('Failed to update announcement:', error);
    return NextResponse.json(
      { error: 'お知らせの更新に失敗しました' },
      { status: 500 }
    );
  }
}

// お知らせ削除（管理者のみ）
export async function DELETE(request: NextRequest) {
  try {
    const userId = request.cookies.get('userId')?.value;
    if (!userId) {
      return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 });
    }
    
    const user = await getUserById(userId);
    if (!user || !isAdmin(user.email)) {
      return NextResponse.json({ error: '管理者権限が必要です' }, { status: 403 });
    }
    
    const id = request.nextUrl.searchParams.get('id');
    if (!id) {
      return NextResponse.json(
        { error: 'お知らせIDは必須です' },
        { status: 400 }
      );
    }
    
    const deleted = await deleteAnnouncement(id);
    
    if (!deleted) {
      return NextResponse.json(
        { error: 'お知らせが見つかりません' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Failed to delete announcement:', error);
    return NextResponse.json(
      { error: 'お知らせの削除に失敗しました' },
      { status: 500 }
    );
  }
}

