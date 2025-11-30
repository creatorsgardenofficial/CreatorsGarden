import { Pool } from 'pg';

/**
 * PostgreSQLデータベース接続ユーティリティ (pgライブラリを使用)
 *
 * Vercel Postgresの環境変数 (POSTGRES_URL, POSTGRES_PRISMA_URL, PRISMA_DATABASE_URLなど) を使用して接続します。
 * POSTGRES_URLは直接接続用、POSTGRES_PRISMA_URLはプール接続用です。
 * アプリケーションではプール接続を推奨します。
 */

let pool: Pool;

// 環境変数から接続文字列を取得
// 優先順位: POSTGRES_PRISMA_URL (プール接続) -> PRISMA_DATABASE_URL (Prisma Accelerate) -> STORAGE_PRISMA_URL (カスタムプレフィックス) -> POSTGRES_URL (直接接続)
const getConnectionString = () => {
  let connectionString =
    process.env.POSTGRES_PRISMA_URL ||
    process.env.PRISMA_DATABASE_URL ||
    process.env.STORAGE_PRISMA_URL ||
    process.env.STORAGE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_URL_NON_POOLING;

  // prisma+postgres://形式の場合は、postgres://形式に変換
  if (connectionString && connectionString.startsWith('prisma+postgres://')) {
    connectionString = connectionString.replace('prisma+postgres://', 'postgres://');
    console.log('⚠️  Converting prisma+postgres:// to postgres:// format for pg client');
  }
  return connectionString;
};

const connectionString = getConnectionString();
const isVercelEnvironment = process.env.VERCEL === '1' || process.env.VERCEL_ENV !== undefined;

// デバッグ: 環境変数の状態をログ出力（本番環境のみ）
if (isVercelEnvironment) {
  console.log('🔍 Database environment variables check:');
  console.log('  POSTGRES_PRISMA_URL:', !!process.env.POSTGRES_PRISMA_URL);
  console.log('  PRISMA_DATABASE_URL:', !!process.env.PRISMA_DATABASE_URL);
  console.log('  STORAGE_PRISMA_URL:', !!process.env.STORAGE_PRISMA_URL);
  console.log('  STORAGE_URL:', !!process.env.STORAGE_URL);
  console.log('  POSTGRES_URL:', !!process.env.POSTGRES_URL);
  console.log('  POSTGRES_URL_NON_POOLING:', !!process.env.POSTGRES_URL_NON_POOLING);
  console.log('  Using connection string:', connectionString ? 'Found' : 'Not found');
  if (connectionString) {
    console.log('  Connection string format:', connectionString.startsWith('postgres://') ? 'postgres://' : 'unknown');
  }
}

if (connectionString) {
  try {
    pool = new Pool({
      connectionString: connectionString,
      ssl: {
        rejectUnauthorized: false, // Vercel PostgresではSSLが必要
      },
    });
    console.log('✅ PostgreSQL Pool created successfully');
  } catch (error) {
    console.error('❌ Failed to create PostgreSQL Pool:', error);
    console.error('Connection string (first 50 chars):', connectionString.substring(0, 50) + '...');
    throw new Error('Failed to initialize database pool.');
  }
} else {
  const errorMessage = '⚠️  Database connection string is not set. Please configure POSTGRES_PRISMA_URL or POSTGRES_URL in Vercel dashboard.';
  console.error(errorMessage);
  if (isVercelEnvironment) {
    console.error('   Go to: Vercel Dashboard → Project → Settings → Environment Variables');
  }
  throw new Error(errorMessage);
}

// データベース接続の確認
export async function testConnection(): Promise<boolean> {
  try {
    await pool.query('SELECT 1');
    console.log('✅ Database connection test successful');
    return true;
  } catch (error: any) {
    console.error('❌ Database connection test failed:', error);
    console.error('Error code:', error?.code);
    console.error('Error message:', error?.message);
    console.error('Error name:', error?.name);
    console.error('Error stack:', error?.stack);
    if (error?.code === 'ECONNREFUSED') {
      console.error('⚠️  Connection refused. Check database server status and firewall rules.');
    } else if (error?.code === '28P01') {
      console.error('⚠️  Authentication failed. Check database credentials (username/password).');
    } else if (error?.code === 'ENOTFOUND') {
      console.error('⚠️  Database host not found. Check connection string host.');
    } else if (error?.code === 'invalid_connection_string') {
      console.error('⚠️  Invalid connection string. Ensure it is a valid PostgreSQL connection URL.');
    }
    return false;
  }
}

// データベースが利用可能かどうかをチェック
export function isDatabaseAvailable(): boolean {
  // Vercel Postgresの環境変数が設定されているかチェック
  // カスタムプレフィックス（STORAGEなど）が設定されている場合も対応
  return !!(
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.PRISMA_DATABASE_URL ||
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.STORAGE_URL ||
    process.env.STORAGE_PRISMA_URL ||
    process.env.STORAGE_URL_NON_POOLING
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

