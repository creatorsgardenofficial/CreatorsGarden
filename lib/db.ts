import { sql } from '@vercel/postgres';

/**
 * Vercel Postgresデータベース接続ユーティリティ
 * 
 * @vercel/postgresのsqlタグは自動的に環境変数から接続文字列を読み取ります。
 * 優先順位: POSTGRES_PRISMA_URL > POSTGRES_URL > POSTGRES_URL_NON_POOLING
 * 
 * 注意: POSTGRES_URLは直接接続文字列のため、sqlタグでは使用できません。
 * POSTGRES_PRISMA_URLが設定されている必要があります。
 */

// データベース接続の確認
export async function testConnection(): Promise<boolean> {
  try {
    await sql`SELECT 1`;
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}

// データベースが利用可能かどうかをチェック
export function isDatabaseAvailable(): boolean {
  // Vercel Postgresの環境変数が設定されているかチェック
  return !!(
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL_NON_POOLING
  );
}

// 開発環境ではファイルシステム、本番環境ではデータベースを使用
export function shouldUseDatabase(): boolean {
  // データベースが利用可能で、本番環境の場合はデータベースを使用
  if (isDatabaseAvailable()) {
    // 開発環境でもデータベースを使用する場合は、環境変数で制御
    // Vercel環境（本番、プレビュー、開発）では常にデータベースを使用
    return process.env.USE_DATABASE === 'true' || 
           process.env.VERCEL === '1' || 
           process.env.VERCEL_ENV !== undefined;
  }
  return false;
}

export { sql };
