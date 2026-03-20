import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * クライアントIPアドレスを取得（Edge Runtime用）
 */
function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  return forwarded?.split(',')[0]?.trim() || realIp || 'unknown';
}

/**
 * アクセスログを記録（非同期、エラーが発生しても処理を続行）
 */
async function logAccess(request: NextRequest, pathname: string) {
  try {
    // 静的ファイルやAPIエンドポイントは記録しない
    if (
      pathname.startsWith('/_next/') ||
      pathname.startsWith('/api/') ||
      pathname === '/favicon.ico' ||
      pathname.startsWith('/sitemap') ||
      pathname.startsWith('/robots')
    ) {
      return;
    }

    const userId = request.cookies.get('userId')?.value;
    const ipAddress = getClientIp(request);
    const userAgent = request.headers.get('user-agent') || undefined;
    const referer = request.headers.get('referer') || undefined;
    const method = request.method;

    // 非同期でアクセスログを記録（レスポンスをブロックしない）
    const baseUrl = request.nextUrl.origin;
    fetch(`${baseUrl}/api/analytics/log`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        path: pathname,
        method,
        userId: userId || undefined,
        ipAddress,
        userAgent,
        referer,
      }),
    }).catch((error) => {
      // エラーを無視（アクセスログの記録失敗でサイトが停止しないように）
      });
  } catch (error) {
    // エラーを無視
    }
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  
  // アクセスログを記録（非同期、レスポンスをブロックしない）
  logAccess(request, pathname);

  // メンテナンス状態をチェック（APIエンドポイント経由）
  try {
    
    // メンテナンスページ自体、管理者ページ、APIエンドポイント、静的ファイルは除外
    // ログインページと新規登録ページはメンテナンスチェックの対象とする
    if (
      pathname === '/maintenance' ||
      pathname === '/reactivate' ||
      pathname === '/forgot-password' ||
      pathname === '/reset-password' ||
      pathname === '/admin' ||
      pathname === '/sitemap.xml' ||
      pathname === '/robots.txt' ||
      pathname.startsWith('/api/') ||
      pathname.startsWith('/_next/') ||
      pathname.startsWith('/favicon.ico')
    ) {
      return NextResponse.next();
    }

    // 管理者チェックを先に行う（管理者の場合はメンテナンスチェックをスキップ）
    const userId = request.cookies.get('userId')?.value;
    let isAdminUser = false;
    if (userId) {
      try {
        const baseUrl = request.nextUrl.origin;
        const adminCheckRes = await fetch(`${baseUrl}/api/admin/check`, {
          headers: {
            'Cookie': request.headers.get('cookie') || '',
          },
          cache: 'no-store',
        });
        
        if (adminCheckRes.ok) {
          const adminData = await adminCheckRes.json();
          if (adminData.isAdmin) {
            isAdminUser = true;
            // 管理者の場合はメンテナンスチェックをスキップして通常通りアクセス可能
            // ただし、/loginと/registerへのアクセスはメンテナンスチェックの対象とする
            if (pathname !== '/login' && pathname !== '/register') {
              return NextResponse.next();
            }
          }
        }
      } catch (err) {
        // エラー時はメンテナンスチェックを続行
      }
    }

    // メンテナンス状態をチェック
    const baseUrl = request.nextUrl.origin;
    const maintenanceRes = await fetch(`${baseUrl}/api/system/maintenance`, {
      headers: {
        'Cookie': request.headers.get('cookie') || '',
      },
      cache: 'no-store',
    });
    
    if (maintenanceRes.ok) {
      const data = await maintenanceRes.json();
      
      // メンテナンス中の場合
      if (data.isMaintenance === true) {
        // ログインページと新規登録ページへのアクセスもブロック（管理者は除く）
        if (pathname === '/login' || pathname === '/register') {
          // 管理者でない場合はメンテナンスページにリダイレクト
          if (!isAdminUser) {
            return NextResponse.redirect(new URL('/maintenance', request.url));
          }
        } else {
          // その他のページもメンテナンスページにリダイレクト
          return NextResponse.redirect(new URL('/maintenance', request.url));
        }
      }
    }
  } catch (error) {
    // エラー時は通常通り処理を続行
    }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
