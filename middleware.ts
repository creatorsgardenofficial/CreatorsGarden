import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  // メンテナンス状態をチェック（APIエンドポイント経由）
  try {
    const pathname = request.nextUrl.pathname;
    
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
    console.error('Maintenance check error:', error);
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
