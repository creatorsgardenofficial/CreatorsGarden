import { Pool } from 'pg';

/**
 * PostgreSQL接続ユーティリティ（pg版）
 *
 * Vercel Postgres の「直接接続用 URL」（POSTGRES_URL）を
 * そのまま pg の接続文字列として使用します。
 *
 * Prisma Accelerate 用の `prisma+postgres://` 形式は使用しません。
 */

// 接続文字列の決定
const connectionString =
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.POSTGRES_URL_NON_POOLING;

// pg の接続プールを作成
export const pool = new Pool(
  connectionString
    ? { connectionString }
    : undefined
);

// データベース接続の確認（pg版）
export async function testConnection(): Promise<boolean> {
  try {
    const result = await pool.query('SELECT 1');
    console.log('✅ Database connection test successful', result.rows[0]);
    return true;
  } catch (error: any) {
    console.error('❌ Database connection test failed (pg):', error);
    console.error('Error code:', error?.code);
    console.error('Error message:', error?.message);
    console.error('Error name:', error?.name);
    console.error('Error stack:', error?.stack);
    return false;
  }
}

// データベースが利用可能かどうかをチェック
export function isDatabaseAvailable(): boolean {
  // PostgreSQLの接続文字列が設定されているかチェック
  return !!(
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL_NON_POOLING
  );
}

// 開発環境ではファイルシステム、本番環境ではデータベースを使用
export function shouldUseDatabase(): boolean {
  // Vercel環境（本番、プレビュー、開発）では常にデータベースを使用
  // 本番環境では環境変数が設定されていなくてもデータベースを使用する必要がある
  const isVercelEnvironment = process.env.VERCEL === '1' || process.env.VERCEL_ENV !== undefined;
  
  if (isVercelEnvironment) {
    // 本番環境では常にデータベースを使用（環境変数が設定されていない場合はエラーになるが、それは後で検出される）
    return true;
  }
  
  // 開発環境では、USE_DATABASE環境変数またはデータベースが利用可能な場合にデータベースを使用
  if (isDatabaseAvailable()) {
    return process.env.USE_DATABASE === 'true';
  }
  
  return false;
}

// 以前は @vercel/postgres の sql タグを再エクスポートしていたが、
// 現在は pg の Pool を使用しているため sql は提供しない。
// 代わりに pool を経由してクエリを実行する。

