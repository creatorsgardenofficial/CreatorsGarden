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
// POSTGRES_PRISMA_URLが設定されている場合は、createClient()を使用
// それ以外の場合は、デフォルトのsqlタグを使用
let sqlInstance: typeof defaultSql;

const prismaUrl = process.env.POSTGRES_PRISMA_URL || process.env.PRISMA_DATABASE_URL;

if (prismaUrl) {
  // プール接続文字列が設定されている場合は、createClient()を使用
  const client = createClient({ connectionString: prismaUrl });
  // client.sqlは既にバインドされている関数なので、直接使用
  sqlInstance = client.sql as typeof defaultSql;
} else {
  // プール接続文字列が設定されていない場合、デフォルトのsqlを使用
  // ただし、本番環境ではエラーが発生する可能性があります
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
