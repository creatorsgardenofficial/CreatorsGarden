import { NextRequest } from 'next/server';
import { getUserById } from './storage';

/**
 * クライアントIPアドレスを取得
 */
export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  // @ts-ignore - request.ip may not be in type definition
  return forwarded?.split(',')[0] || realIp || request.ip || 'unknown';
}

/**
 * ユーザーがアクティブかどうかをチェック
 */
export async function checkUserActive(userId: string | undefined): Promise<{ active: boolean; user?: any }> {
  if (!userId) {
    return { active: false };
  }
  const user = await getUserById(userId);
  if (!user || user.isActive === false) {
    return { active: false };
  }
  return { active: true, user };
}

