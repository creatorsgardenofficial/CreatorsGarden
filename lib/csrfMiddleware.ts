import { NextRequest, NextResponse } from 'next/server';
import { verifyCsrfToken } from './csrf';
import { logSecurityEvent } from './securityLog';

// クライアントIPを取得
function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  return forwarded?.split(',')[0] || realIp || 'unknown';
}

/**
 * CSRF保護が必要なHTTPメソッド
 */
const PROTECTED_METHODS = ['POST', 'PUT', 'DELETE', 'PATCH'];

/**
 * CSRF保護が不要なパス（認証関連など）
 */
const EXCLUDED_PATHS = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/logout',
];

/**
 * CSRFトークンを検証するミドルウェア関数
 */
export function verifyCsrf(request: NextRequest): { valid: boolean; response?: NextResponse } {
  // GET、HEAD、OPTIONSメソッドはCSRF保護不要
  if (!PROTECTED_METHODS.includes(request.method)) {
    return { valid: true };
  }

  const path = request.nextUrl.pathname;
  
  // 除外パスはCSRF保護不要
  if (EXCLUDED_PATHS.some(excluded => path.startsWith(excluded))) {
    return { valid: true };
  }

  const userId = request.cookies.get('userId')?.value;
  const csrfToken = request.headers.get('x-csrf-token') || request.cookies.get('csrfToken')?.value;

  // ログインしていない場合はCSRF保護不要
  if (!userId) {
    return { valid: true };
  }

  // CSRFトークンがない場合は拒否
  if (!csrfToken) {
    const ip = getClientIp(request);
    const userAgent = request.headers.get('user-agent') || 'unknown';
    
    // セキュリティログに記録
    logSecurityEvent('csrf_failure', {
      userId,
      ip,
      userAgent,
      details: { path, reason: 'token_missing' },
      severity: 'high',
    }).catch(() => {}); // ログ記録の失敗は無視
    
    return {
      valid: false,
      response: NextResponse.json(
        { error: 'CSRFトークンが必要です' },
        { status: 403 }
      ),
    };
  }

  // CSRFトークンを検証
  if (!verifyCsrfToken(userId, csrfToken)) {
    const ip = getClientIp(request);
    const userAgent = request.headers.get('user-agent') || 'unknown';
    
    // セキュリティログに記録
    logSecurityEvent('csrf_failure', {
      userId,
      ip,
      userAgent,
      details: { path, reason: 'token_invalid' },
      severity: 'high',
    }).catch(() => {}); // ログ記録の失敗は無視
    
    return {
      valid: false,
      response: NextResponse.json(
        { error: '無効なCSRFトークンです' },
        { status: 403 }
      ),
    };
  }

  return { valid: true };
}

