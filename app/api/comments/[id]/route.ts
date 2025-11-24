import { NextRequest, NextResponse } from 'next/server';
import { getCommentById, updateComment, deleteComment, adminDeleteComment, getUserById } from '@/lib/storage';
import { validateContent } from '@/lib/contentFilter';
import { isAdmin } from '@/lib/admin';

// コメントの最大文字数
const MAX_COMMENT_LENGTH = 500;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const comment = await getCommentById(id);

    if (!comment) {
      return NextResponse.json(
        { error: 'コメントが見つかりません' },
        { status: 404 }
      );
    }

    return NextResponse.json({ comment }, { status: 200 });
  } catch (error) {
    console.error('Get comment error:', error);
    return NextResponse.json(
      { error: 'コメントの取得に失敗しました' },
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
    const comment = await getCommentById(id);

    if (!comment) {
      return NextResponse.json(
        { error: 'コメントが見つかりません' },
        { status: 404 }
      );
    }

    if (comment.userId !== userId) {
      return NextResponse.json(
        { error: '権限がありません' },
        { status: 403 }
      );
    }

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

    const updatedComment = await updateComment(id, { content });

    return NextResponse.json({ comment: updatedComment }, { status: 200 });
  } catch (error) {
    console.error('Update comment error:', error);
    return NextResponse.json(
      { error: 'コメントの更新に失敗しました' },
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
    const comment = await getCommentById(id);

    if (!comment) {
      return NextResponse.json(
        { error: 'コメントが見つかりません' },
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
    if (comment.userId !== userId && !isUserAdmin) {
      return NextResponse.json(
        { error: '権限がありません' },
        { status: 403 }
      );
    }

    // 管理者の場合はメッセージを残す削除、通常ユーザーの場合は完全削除
    if (isUserAdmin && comment.userId !== userId) {
      await adminDeleteComment(id);
      return NextResponse.json({ message: 'コメントを管理者により削除しました' }, { status: 200 });
    } else {
      await deleteComment(id);
      return NextResponse.json({ message: 'コメントを削除しました' }, { status: 200 });
    }
  } catch (error) {
    console.error('Delete comment error:', error);
    return NextResponse.json(
      { error: 'コメントの削除に失敗しました' },
      { status: 500 }
    );
  }
}

