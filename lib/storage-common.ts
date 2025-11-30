/**
 * ストレージ操作の共通ヘルパー関数
 * ローカルと本番環境で一貫した動作を保証する
 */

/**
 * データベースを使用するかどうかを判定
 * Vercel環境では常にtrueを返す
 */
export async function shouldUseDatabaseStorage(): Promise<boolean> {
  const { shouldUseDatabase } = await import('./db');
  return shouldUseDatabase();
}

/**
 * Vercel本番環境かどうかを判定
 */
export function isVercelProduction(): boolean {
  return process.env.VERCEL === '1' || process.env.VERCEL_ENV === 'production';
}

/**
 * データベースを使用する必要がある場合にエラーをスロー
 */
export function throwDatabaseRequiredError(): never {
  throw new Error('Database is required in production environment. Please configure POSTGRES_PRISMA_URL.');
}

