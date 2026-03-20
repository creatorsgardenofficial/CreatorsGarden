import { NextRequest, NextResponse } from 'next/server';
import { getUserById, getSystemSettings, updateSystemSettings } from '@/lib/storage';
import { isAdmin } from '@/lib/admin';

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

    const settings = await getSystemSettings();
    return NextResponse.json({ settings }, { status: 200 });
  } catch (error) {
    // 本番環境では詳細なエラー情報をログに出力しない
    if (process.env.NODE_ENV === 'development') {
      } else {
      }
    return NextResponse.json(
      { error: 'メンテナンス設定の取得に失敗しました' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
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

    const body = await request.json();
    const { isMaintenance, maintenanceMessage } = body;

    const updatedSettings = await updateSystemSettings({
      isMaintenance: isMaintenance !== undefined ? isMaintenance : undefined,
      maintenanceMessage: maintenanceMessage !== undefined ? maintenanceMessage : undefined,
    });

    return NextResponse.json({ settings: updatedSettings }, { status: 200 });
  } catch (error) {
    // 本番環境では詳細なエラー情報をログに出力しない
    if (process.env.NODE_ENV === 'development') {
      } else {
      }
    return NextResponse.json(
      { error: 'メンテナンス設定の更新に失敗しました' },
      { status: 500 }
    );
  }
}

