import { NextRequest, NextResponse } from 'next/server';
import { getUserById } from '@/lib/storage';
import { getAccessStats } from '@/lib/storage-db';
import { isAdmin } from '@/lib/admin';
import { shouldUseDatabaseStorage } from '@/lib/storage-common';

/**
 * アクセス統計を取得するAPIエンドポイント（管理者専用）
 */
export async function GET(request: NextRequest) {
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

    // 管理者チェック
    if (!isAdmin(user.email)) {
      return NextResponse.json(
        { error: '管理者権限が必要です' },
        { status: 403 }
      );
    }

    // データベースが利用可能でない場合はエラー
    if (!(await shouldUseDatabaseStorage())) {
      return NextResponse.json(
        { error: 'データベースが利用できません' },
        { status: 503 }
      );
    }

    const url = new URL(request.url);
    const startDate = url.searchParams.get('startDate') || undefined;
    const endDate = url.searchParams.get('endDate') || undefined;
    const path = url.searchParams.get('path') || undefined;

    const stats = await getAccessStats({
      startDate,
      endDate,
      path,
    });

    return NextResponse.json({ stats }, { status: 200 });
  } catch (error: any) {
    console.error('Failed to get access stats:', error);
    // テーブルが存在しないエラーの場合、より明確なメッセージを返す
    if (error?.message?.includes('does not exist') || error?.code === '42P01') {
      return NextResponse.json(
        { 
          error: 'アクセスログテーブルが存在しません。データベースにテーブルを作成してください。',
          details: 'scripts/add-access-logs-table.sql を実行してください。'
        },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { error: 'アクセス統計の取得に失敗しました', details: error?.message || 'Unknown error' },
      { status: 500 }
    );
  }
}

