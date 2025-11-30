import { Pool } from 'pg';

/**
 * PostgreSQLデータベース接続ユーティリティ (pgライブラリを使用)
 *
 * Vercel Postgresの環境変数 (POSTGRES_URL, POSTGRES_PRISMA_URL, PRISMA_DATABASE_URLなど) を使用して接続します。
 * POSTGRES_URLは直接接続用、POSTGRES_PRISMA_URLはプール接続用です。
 * アプリケーションではプール接続を推奨します。
 */

// 環境変数から接続文字列を取得
// 優先順位: POSTGRES_PRISMA_URL (プール接続) -> STORAGE_PRISMA_URL (カスタムプレフィックス) -> POSTGRES_URL (直接接続) -> PRISMA_DATABASE_URL (Prisma Accelerate、変換が必要)
// 注意: PRISMA_DATABASE_URLがprisma+postgres://形式の場合は、pgライブラリでは直接使用できないため、最後の選択肢とする
const getConnectionString = () => {
  // まず、直接PostgreSQL接続文字列を優先
  let connectionString =
    process.env.POSTGRES_PRISMA_URL ||
    process.env.STORAGE_PRISMA_URL ||
    process.env.STORAGE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_URL_NON_POOLING;

  // 直接接続文字列がない場合のみ、PRISMA_DATABASE_URLを確認
  if (!connectionString && process.env.PRISMA_DATABASE_URL) {
    const prismaUrl = process.env.PRISMA_DATABASE_URL;
    // prisma+postgres://形式の場合は、postgres://形式に変換を試みる
    if (prismaUrl.startsWith('prisma+postgres://')) {
      // Prisma Accelerateの接続文字列は、pgライブラリでは直接使用できない
      // 変換を試みるが、接続に失敗する可能性がある
      connectionString = prismaUrl.replace('prisma+postgres://', 'postgres://');
      console.log('⚠️  Converting prisma+postgres:// to postgres:// format for pg client');
      console.log('⚠️  Note: Prisma Accelerate connection strings may not work with pg library directly');
      console.log('⚠️  Consider using POSTGRES_PRISMA_URL or POSTGRES_URL instead');
    } else {
      // 既にpostgres://形式の場合はそのまま使用
      connectionString = prismaUrl;
    }
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

// pool を初期化してエクスポート
export const pool = (() => {
  if (!connectionString) {
    const errorMessage = '⚠️  Database connection string is not set. Please configure POSTGRES_PRISMA_URL or POSTGRES_URL in Vercel dashboard.';
    console.error(errorMessage);
    if (isVercelEnvironment) {
      console.error('   Go to: Vercel Dashboard → Project → Settings → Environment Variables');
    }
    throw new Error(errorMessage);
  }

  try {
    const poolInstance = new Pool({
      connectionString: connectionString,
      ssl: {
        rejectUnauthorized: false, // Vercel PostgresではSSLが必要
      },
      // 接続タイムアウトとリトライ設定
      connectionTimeoutMillis: 10000, // 10秒
      idleTimeoutMillis: 30000, // 30秒
      max: 10, // 最大接続数
    });
    
    // 接続エラーのハンドリング
    poolInstance.on('error', (err) => {
      console.error('❌ Unexpected error on idle database client:', err);
    });
    
    console.log('✅ PostgreSQL Pool created successfully');
    return poolInstance;
  } catch (error) {
    console.error('❌ Failed to create PostgreSQL Pool:', error);
    console.error('Connection string (first 50 chars):', connectionString.substring(0, 50) + '...');
    throw new Error('Failed to initialize database pool.');
  }
})();

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

