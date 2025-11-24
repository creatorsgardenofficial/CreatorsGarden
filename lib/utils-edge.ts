import { NextRequest } from 'next/server';

/**
 * クライアントIPアドレスを取得（Edge Runtime用）
 * Edge RuntimeではNode.jsモジュールが使用できないため、このファイルは独立しています
 */
export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  // @ts-ignore - request.ip may not be in type definition
  return forwarded?.split(',')[0] || realIp || request.ip || 'unknown';
}

