import { sql as defaultSql, createClient } from '@vercel/postgres';

/**
 * Vercel Postgresデータベース接続ユーティリティ
 * 
 * @vercel/postgresのsqlタグは自動的に環境変数から接続文字列を読み取ります。
 * しかし、POSTGRES_PRISMA_URLが設定されている場合、明示的にcreateClient()を使用します。
 * 
 * 注意: POSTGRES_URLは直接接続文字列のため、sqlタグでは使用できません。
 * POSTGRES_PRISMA_URLが設定されている必要があります。
 */

// sqlインスタンスを初期化
// @vercel/postgresのsqlタグは、POSTGRES_PRISMA_URLを自動的に探します
// しかし、明示的にcreateClient()を使用することで、確実に接続文字列を指定できます
let sqlInstance: typeof defaultSql;

const prismaUrl = process.env.POSTGRES_PRISMA_URL || process.env.PRISMA_DATABASE_URL;
const isVercelEnvironment = process.env.VERCEL === '1' || process.env.VERCEL_ENV !== undefined;

if (prismaUrl) {
  // プール接続文字列が設定されている場合は、createClient()を使用
  try {
    const client = createClient({ connectionString: prismaUrl });
    // client.sqlは既にバインドされている関数なので、直接使用
    sqlInstance = client.sql as typeof defaultSql;
  } catch (error) {
    console.error('Failed to create database client:', error);
    // フォールバック: デフォルトのsqlタグを使用
    sqlInstance = defaultSql;
  }
} else if (isVercelEnvironment) {
  // 本番環境でPOSTGRES_PRISMA_URLが設定されていない場合
  // @vercel/postgresのsqlタグは自動的に環境変数を探しますが、
  // POSTGRES_PRISMA_URLが設定されていない場合はエラーが発生します
  console.error('⚠️  POSTGRES_PRISMA_URL is not set in production environment.');
  console.error('   Please configure POSTGRES_PRISMA_URL in Vercel dashboard.');
  console.error('   Go to: Vercel Dashboard → Project → Settings → Environment Variables');
  // デフォルトのsqlタグを使用（エラーは実際のクエリ実行時に発生する）
  sqlInstance = defaultSql;
} else {
  // 開発環境でプール接続文字列が設定されていない場合、デフォルトのsqlを使用
  sqlInstance = defaultSql;
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
    process.env.PRISMA_DATABASE_URL ||
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

export { sqlInstance as sql };
