import { sql, createClient } from '@vercel/postgres';

/**
 * Vercel Postgresデータベース接続ユーティリティ
 * 
 * @vercel/postgresのsqlタグはプール接続文字列（POSTGRES_PRISMA_URL）を必要とします。
 * POSTGRES_URLは直接接続用のため、sqlタグでは使用できません。
 */

// sqlインスタンスを取得（プール接続文字列を優先）
// @vercel/postgresのsqlタグは自動的にPOSTGRES_PRISMA_URLを探します
// しかし、POSTGRES_URLが設定されているとそれを優先しようとするため、
// 明示的にPOSTGRES_PRISMA_URLを使用するクライアントを作成します
let sqlInstance: typeof sql;

// 環境変数に基づいて適切なsqlインスタンスを初期化
// @vercel/postgresはPOSTGRES_PRISMA_URLを優先しますが、
// PRISMA_DATABASE_URLも使用可能です
const prismaUrl = process.env.POSTGRES_PRISMA_URL || process.env.PRISMA_DATABASE_URL;

if (prismaUrl) {
  // プール接続文字列が設定されている場合はそれを使用（推奨）
  const client = createClient({ connectionString: prismaUrl });
  sqlInstance = client.sql as typeof sql;
} else {
  // プール接続文字列が設定されていない場合、デフォルトのsqlを使用
  // ただし、POSTGRES_URLのみが設定されている場合はエラーが発生する可能性があります
  if (process.env.POSTGRES_URL && !prismaUrl) {
    console.warn('⚠️  POSTGRES_PRISMA_URL or PRISMA_DATABASE_URL is not set.');
    console.warn('   POSTGRES_URL may cause connection errors.');
    console.warn('   Please set POSTGRES_PRISMA_URL in Vercel dashboard.');
  }
  sqlInstance = sql;
}

// データベース接続の確認
export async function testConnection(): Promise<boolean> {
  try {
    await sqlInstance`SELECT 1`;
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

export { sqlInstance as sql };

