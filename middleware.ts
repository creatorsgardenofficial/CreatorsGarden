import { NextRequest, NextResponse } from 'next/server';
// Note: CSRFチェックとセキュリティログは各APIルートで個別に処理
// Edge RuntimeではNode.jsモジュール（fs, path, crypto）が使用できないため

// レート制限用のストア（メモリベース、本番環境ではRedisなどを推奨）
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// レート制限の設定
// 開発環境では緩和、本番環境では厳格に設定
const isDevelopment = process.env.NODE_ENV === 'development';

const RATE_LIMITS = {
  login: { maxRequests: isDevelopment ? 50 : 10, windowMs: 15 * 60 * 1000 }, // 15分間に10回（開発環境では50回）
  register: { maxRequests: isDevelopment ? 30 : 10, windowMs: 60 * 60 * 1000 }, // 1時間に10回（開発環境では30回）- Vercelの複数インスタンスを考慮して緩和
  post: { maxRequests: isDevelopment ? 100 : 10, windowMs: 60 * 60 * 1000 }, // 1時間に10回（開発環境では100回）
  comment: { maxRequests: isDevelopment ? 200 : 20, windowMs: 60 * 60 * 1000 }, // 1時間に20回（開発環境では200回）
  message: { maxRequests: isDevelopment ? 300 : 30, windowMs: 60 * 60 * 1000 }, // 1時間に30回（開発環境では300回）
  default: { maxRequests: isDevelopment ? 1000 : 100, windowMs: 60 * 60 * 1000 }, // 1時間に100回（開発環境では1000回）
};

import { getClientIp } from '@/lib/utils-edge';

// レート制限チェック
function checkRateLimit(
  key: string,
  limit: { maxRequests: number; windowMs: number }
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const record = rateLimitStore.get(key);

  if (!record || now > record.resetTime) {
    // 新しいウィンドウを開始
    const resetTime = now + limit.windowMs;
    rateLimitStore.set(key, { count: 1, resetTime });
    return { allowed: true, remaining: limit.maxRequests - 1, resetTime };
  }

  if (record.count >= limit.maxRequests) {
    // レート制限超過
    return { allowed: false, remaining: 0, resetTime: record.resetTime };
  }

  // カウントを増やす
  record.count++;
  rateLimitStore.set(key, record);
  return {
    allowed: true,
    remaining: limit.maxRequests - record.count,
    resetTime: record.resetTime,
  };
}

// 古いレコードをクリーンアップ（メモリリーク防止）
function cleanupRateLimitStore() {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}

// 定期的にクリーンアップ（5分ごと）
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupRateLimitStore, 5 * 60 * 1000);
}

export async function middleware(request: NextRequest) {
  const ip = getClientIp(request);
  const path = request.nextUrl.pathname;

  // レート制限の対象となるパス
  let rateLimitKey: string | null = null;
  let rateLimit: { maxRequests: number; windowMs: number } | null = null;

  if (path === '/api/auth/login') {
    rateLimitKey = `login:${ip}`;
    rateLimit = RATE_LIMITS.login;
  } else if (path === '/api/auth/register') {
    rateLimitKey = `register:${ip}`;
    rateLimit = RATE_LIMITS.register;
  } else if (path === '/api/posts' && request.method === 'POST') {
    rateLimitKey = `post:${ip}`;
    rateLimit = RATE_LIMITS.post;
  } else if (path.startsWith('/api/posts/') && path.endsWith('/comments') && request.method === 'POST') {
    rateLimitKey = `comment:${ip}`;
    rateLimit = RATE_LIMITS.comment;
  } else if (path.startsWith('/api/messages') && request.method === 'POST') {
    rateLimitKey = `message:${ip}`;
    rateLimit = RATE_LIMITS.message;
  } else if (path.startsWith('/api/group-chats/messages') && request.method === 'POST') {
    rateLimitKey = `message:${ip}`;
    rateLimit = RATE_LIMITS.message;
  } else if (path.startsWith('/api/')) {
    // その他のAPIエンドポイント
    // 通知系のAPIはレート制限を緩和（ポーリング用）
    if (path.includes('/messages') || 
        path.includes('/group-chats') || 
        path.includes('/feedback/notifications') ||
        path.includes('/admin/feedback') ||
        path.includes('/bookmarks') ||
        path === '/api/auth/me' ||
        path === '/api/auth/profile' ||
        path === '/api/admin/check' ||
        path === '/api/feedback/my' ||
        path === '/api/admin/users' ||
        (path === '/api/posts' && request.method === 'GET') ||
        (path.startsWith('/api/posts/') && path.endsWith('/like') && request.method === 'GET')) {
      // 通知系APIと頻繁に呼び出されるGET APIは開発環境では制限なし、本番環境でも緩和
      rateLimitKey = `polling:${ip}`;
      rateLimit = { 
        maxRequests: isDevelopment ? 10000 : 500, 
        windowMs: 60 * 1000 // 1分間
      };
    } else {
      rateLimitKey = `api:${ip}`;
      rateLimit = RATE_LIMITS.default;
    }
  }

  // レート制限チェック
  if (rateLimitKey && rateLimit) {
    const result = checkRateLimit(rateLimitKey, rateLimit);
    
    if (!result.allowed) {
      // レート制限超過
      // Note: セキュリティログは各APIルートで記録
      const response = NextResponse.json(
        { error: 'リクエストが多すぎます。しばらく時間をおいてから再度お試しください。' },
        { status: 429 }
      );
      
      // レート制限情報をヘッダーに追加
      response.headers.set('X-RateLimit-Limit', rateLimit.maxRequests.toString());
      response.headers.set('X-RateLimit-Remaining', result.remaining.toString());
      response.headers.set('X-RateLimit-Reset', new Date(result.resetTime).toISOString());
      response.headers.set('Retry-After', Math.ceil((result.resetTime - Date.now()) / 1000).toString());
      
      return response;
    }

    // レート制限情報をヘッダーに追加
    const response = NextResponse.next();
    response.headers.set('X-RateLimit-Limit', rateLimit.maxRequests.toString());
    response.headers.set('X-RateLimit-Remaining', result.remaining.toString());
    response.headers.set('X-RateLimit-Reset', new Date(result.resetTime).toISOString());
    
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/api/:path*',
  ],
};

