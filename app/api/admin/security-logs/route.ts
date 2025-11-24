import { NextRequest, NextResponse } from 'next/server';
import { getUserById } from '@/lib/storage';
import { getSecurityLogs, detectAnomalies } from '@/lib/securityLog';
import { isAdmin } from '@/lib/admin';

// セキュリティログ取得
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

    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '100');
    const type = url.searchParams.get('type') as any;
    const severity = url.searchParams.get('severity') as any;
    const targetUserId = url.searchParams.get('userId') || undefined;
    const startDate = url.searchParams.get('startDate') || undefined;
    const endDate = url.searchParams.get('endDate') || undefined;

    const logs = await getSecurityLogs({
      limit,
      type,
      severity,
      userId: targetUserId,
      startDate,
      endDate,
    });

    // 異常検知
    const anomalies = await detectAnomalies();

    return NextResponse.json({
      logs,
      anomalies,
      total: logs.length,
    }, { status: 200 });
  } catch (error) {
    console.error('Get security logs error:', error);
    return NextResponse.json(
      { error: 'セキュリティログの取得に失敗しました' },
      { status: 500 }
    );
  }
}

