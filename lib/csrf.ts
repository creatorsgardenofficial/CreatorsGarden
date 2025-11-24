import { randomBytes } from 'crypto';

// CSRFトークンのストア（セッション用、本番環境ではRedisなどを推奨）
const csrfTokens = new Map<string, { token: string; expiresAt: number }>();

// トークンの有効期限（30分）
const TOKEN_EXPIRY = 30 * 60 * 1000;

/**
 * CSRFトークンを生成
 * @param sessionId セッションID（userIdなど）
 * @returns CSRFトークン
 */
export function generateCsrfToken(sessionId: string): string {
  const token = randomBytes(32).toString('hex');
  const expiresAt = Date.now() + TOKEN_EXPIRY;
  
  csrfTokens.set(sessionId, { token, expiresAt });
  
  // 古いトークンをクリーンアップ
  cleanupExpiredTokens();
  
  return token;
}

/**
 * CSRFトークンを検証
 * @param sessionId セッションID
 * @param token 検証するトークン
 * @returns 有効な場合はtrue
 */
export function verifyCsrfToken(sessionId: string, token: string): boolean {
  const stored = csrfTokens.get(sessionId);
  
  if (!stored) {
    return false;
  }
  
  // 有効期限チェック
  if (Date.now() > stored.expiresAt) {
    csrfTokens.delete(sessionId);
    return false;
  }
  
  // トークンが一致するかチェック
  return stored.token === token;
}

/**
 * CSRFトークンを削除
 * @param sessionId セッションID
 */
export function deleteCsrfToken(sessionId: string): void {
  csrfTokens.delete(sessionId);
}

/**
 * 期限切れのトークンをクリーンアップ
 */
function cleanupExpiredTokens(): void {
  const now = Date.now();
  for (const [sessionId, data] of csrfTokens.entries()) {
    if (now > data.expiresAt) {
      csrfTokens.delete(sessionId);
    }
  }
}

// 定期的にクリーンアップ（5分ごと）
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupExpiredTokens, 5 * 60 * 1000);
}

