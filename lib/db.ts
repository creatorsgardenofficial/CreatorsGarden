import { Pool } from 'pg';

/**
 * PostgreSQLデータベース接続ユーティリティ (pgライブラリを使用)
 *
 * Vercel Postgresの環境変数 (POSTGRES_URL, POSTGRES_PRISMA_URL, PRISMA_DATABASE_URLなど) を使用して接続します。
 * POSTGRES_URLは直接接続用、POSTGRES_PRISMA_URLはプール接続用です。
 * アプリケーションではプール接続を推奨します。
 */

// 接続文字列からホスト名を抽出するヘルパー関数
const extractHostname = (connectionString: string): string | null => {
  try {
    const url = new URL(connectionString);
    return url.hostname;
  } catch {
    // URL形式でない場合は、@記号の後を探す
    const match = connectionString.match(/@([^:/]+)/);
    return match ? match[1] : null;
  }
};

// Prisma Accelerateのエンドポイントを検出する関数
const isPrismaAccelerateEndpoint = (connectionString: string): boolean => {
  const hostname = extractHostname(connectionString);
  if (!hostname) return false;
  // Prisma Accelerateのエンドポイント（db.prisma.io、accelerate.prisma.ioなど）を検出
  return hostname.includes('db.prisma.io') || 
         hostname.includes('accelerate.prisma.io') ||
         hostname.includes('prisma.io');
};

// 環境変数から接続文字列を取得
// 優先順位: POSTGRES_PRISMA_URL (プール接続) -> STORAGE_PRISMA_URL (カスタムプレフィックス) -> POSTGRES_URL (直接接続) -> POSTGRES_URL_NON_POOLING
// 注意: PRISMA_DATABASE_URLがprisma+postgres://形式、またはPrisma Accelerateエンドポイントの場合は、pgライブラリでは使用できないため、完全にスキップする
const getConnectionString = (): string | null => {
  // 優先順位に従って接続文字列を探す（Prisma Accelerateエンドポイントは除外）
  const candidates = [
    process.env.POSTGRES_PRISMA_URL,
    process.env.STORAGE_PRISMA_URL,
    process.env.STORAGE_URL,
    process.env.POSTGRES_URL,
    process.env.POSTGRES_URL_NON_POOLING,
  ];
  
  // Prisma Accelerateエンドポイントでない最初の有効な接続文字列を使用
  for (const candidate of candidates) {
    if (candidate && !isPrismaAccelerateEndpoint(candidate)) {
      return candidate;
    } else if (candidate && isPrismaAccelerateEndpoint(candidate)) {
      console.warn(`⚠️  Skipping Prisma Accelerate endpoint: ${extractHostname(candidate)}`);
    }
  }
  
  // すべての接続文字列がPrisma Accelerateエンドポイントの場合
  // 一時的な回避策として、POSTGRES_PRISMA_URLまたはPOSTGRES_URLを使用を試みる
  // ただし、これは動作しない可能性が高い
  if (process.env.POSTGRES_PRISMA_URL && isPrismaAccelerateEndpoint(process.env.POSTGRES_PRISMA_URL)) {
    console.error('❌ All connection strings point to Prisma Accelerate endpoints');
    console.error('❌ POSTGRES_PRISMA_URL and POSTGRES_URL are pointing to db.prisma.io');
    console.error('❌ Please update these in Vercel Dashboard → Project → Settings → Environment Variables');
    console.error('❌ They should point to Vercel Postgres endpoints (e.g., aws-0-*.pooler.supabase.com)');
    console.error('⚠️  Attempting to use POSTGRES_PRISMA_URL anyway (this will likely fail)...');
    return process.env.POSTGRES_PRISMA_URL;
  }
  
  if (process.env.POSTGRES_URL && isPrismaAccelerateEndpoint(process.env.POSTGRES_URL)) {
    console.error('❌ All connection strings point to Prisma Accelerate endpoints');
    console.error('❌ POSTGRES_URL is pointing to db.prisma.io');
    console.error('❌ Please update this in Vercel Dashboard → Project → Settings → Environment Variables');
    console.error('❌ It should point to Vercel Postgres endpoint (e.g., aws-0-*.pooler.supabase.com)');
    console.error('⚠️  Attempting to use POSTGRES_URL anyway (this will likely fail)...');
    return process.env.POSTGRES_URL;
  }
  
  let connectionString: string | null = null;

  // PRISMA_DATABASE_URLがprisma+postgres://形式の場合は使用しない
  // Prisma Accelerateの接続文字列は、pgライブラリでは直接使用できない
  if (!connectionString && process.env.PRISMA_DATABASE_URL) {
    const prismaUrl = process.env.PRISMA_DATABASE_URL;
    if (prismaUrl.startsWith('prisma+postgres://')) {
      // Prisma Accelerateの接続文字列は使用できない
      console.error('❌ PRISMA_DATABASE_URL is a Prisma Accelerate connection string (prisma+postgres://)');
      console.error('❌ Prisma Accelerate connection strings cannot be used with pg library directly');
      console.error('❌ Please use POSTGRES_PRISMA_URL or POSTGRES_URL instead');
      // 接続文字列をnullのまま返す（エラーは後で投げられる）
      return null;
    } else if (prismaUrl.startsWith('postgres://')) {
      // 既にpostgres://形式の場合でも、Prisma Accelerateエンドポイントの場合は使用しない
      if (isPrismaAccelerateEndpoint(prismaUrl)) {
        console.error('❌ PRISMA_DATABASE_URL points to Prisma Accelerate endpoint (db.prisma.io)');
        console.error('❌ Prisma Accelerate endpoints cannot be used with pg library directly');
        console.error('❌ Please use POSTGRES_PRISMA_URL or POSTGRES_URL from Vercel Postgres instead');
        return null;
      }
      // 通常のPostgreSQL接続文字列の場合は使用
      connectionString = prismaUrl;
      console.log('✅ Using PRISMA_DATABASE_URL (postgres:// format)');
    }
  }

  return connectionString;
};

const connectionString = getConnectionString();
const isVercelEnvironment = process.env.VERCEL === '1' || process.env.VERCEL_ENV !== undefined;

// デバッグ: 環境変数の状態をログ出力（本番環境のみ）
if (isVercelEnvironment) {
  console.log('🔍 Database environment variables check:');
  
  // 各環境変数のホスト名を表示
  if (process.env.POSTGRES_PRISMA_URL) {
    const hostname = extractHostname(process.env.POSTGRES_PRISMA_URL);
    console.log('  POSTGRES_PRISMA_URL:', true, `(host: ${hostname || 'unknown'})`);
    if (hostname && (hostname.includes('db.prisma.io') || hostname.includes('prisma.io'))) {
      console.error('    ❌ This points to Prisma Accelerate endpoint!');
    }
  } else {
    console.log('  POSTGRES_PRISMA_URL:', false);
  }
  
  if (process.env.POSTGRES_URL) {
    const hostname = extractHostname(process.env.POSTGRES_URL);
    console.log('  POSTGRES_URL:', true, `(host: ${hostname || 'unknown'})`);
    if (hostname && (hostname.includes('db.prisma.io') || hostname.includes('prisma.io'))) {
      console.error('    ❌ This points to Prisma Accelerate endpoint!');
    }
  } else {
    console.log('  POSTGRES_URL:', false);
  }
  
  if (process.env.PRISMA_DATABASE_URL) {
    const hostname = extractHostname(process.env.PRISMA_DATABASE_URL);
    console.log('  PRISMA_DATABASE_URL:', true, `(host: ${hostname || 'unknown'}, format: ${process.env.PRISMA_DATABASE_URL.startsWith('prisma+postgres://') ? 'prisma+postgres://' : 'postgres://'})`);
    if (hostname && (hostname.includes('db.prisma.io') || hostname.includes('prisma.io'))) {
      console.error('    ❌ This points to Prisma Accelerate endpoint!');
    }
  } else {
    console.log('  PRISMA_DATABASE_URL:', false);
  }
  
  console.log('  STORAGE_PRISMA_URL:', !!process.env.STORAGE_PRISMA_URL);
  console.log('  STORAGE_URL:', !!process.env.STORAGE_URL);
  console.log('  POSTGRES_URL_NON_POOLING:', !!process.env.POSTGRES_URL_NON_POOLING);
  console.log('  Using connection string:', connectionString ? 'Found' : 'Not found');
  
  if (connectionString) {
    const format = connectionString.startsWith('postgres://') ? 'postgres://' : 
                   connectionString.startsWith('prisma+postgres://') ? 'prisma+postgres:// (INVALID)' : 
                   'unknown';
    const hostname = extractHostname(connectionString);
    const isPrismaEndpoint = isPrismaAccelerateEndpoint(connectionString);
    console.log('  Connection string format:', format);
    console.log('  Connection string host:', hostname || 'unknown');
    if (connectionString.startsWith('prisma+postgres://')) {
      console.error('  ❌ ERROR: prisma+postgres:// format cannot be used with pg library!');
    }
    if (isPrismaEndpoint) {
      console.error('  ❌ ERROR: Connection string points to Prisma Accelerate endpoint (db.prisma.io)!');
      console.error('  ❌ ERROR: Prisma Accelerate endpoints cannot be used with pg library!');
    }
  } else {
    console.error('  ❌ ERROR: No valid connection string found!');
    console.error('  💡 Please set POSTGRES_PRISMA_URL or POSTGRES_URL in Vercel dashboard');
    console.error('  💡 Note: Do NOT use PRISMA_DATABASE_URL if it points to Prisma Accelerate (db.prisma.io)');
    console.error('  💡 Note: POSTGRES_PRISMA_URL and POSTGRES_URL must NOT point to db.prisma.io');
    console.error('  💡 They should point to Vercel Postgres endpoints (e.g., aws-0-*.pooler.supabase.com)');
  }
}

// pool を遅延初期化（lazy initialization）でエクスポート
// ビルド時には初期化せず、実際に使用される時点で初期化する
let poolInstance: Pool | null = null;

const getPool = (): Pool => {
  // 既に初期化されている場合はそれを返す
  if (poolInstance) {
    return poolInstance;
  }

  // ビルド時（NEXT_PHASE === 'phase-production-build'）の場合は、エラーを投げずに警告だけを出す
  const isBuildTime = process.env.NEXT_PHASE === 'phase-production-build';
  
  if (!connectionString) {
    const errorMessage = '⚠️  Database connection string is not set. Please configure POSTGRES_PRISMA_URL or POSTGRES_URL in Vercel dashboard.';
    if (isBuildTime) {
      // ビルド時は警告だけを出して、ダミーのPoolを返す（実際には使用されない）
      console.warn(errorMessage);
      console.warn('   This is a build-time warning. The connection will be validated at runtime.');
      // ビルド時はダミーのPoolを作成（実際には使用されない）
      poolInstance = new Pool({
        connectionString: 'postgres://dummy:dummy@dummy:5432/dummy',
        ssl: { rejectUnauthorized: false },
      });
      return poolInstance;
    } else {
      // 実行時はエラーを投げる
      console.error(errorMessage);
      if (isVercelEnvironment) {
        console.error('   Go to: Vercel Dashboard → Project → Settings → Environment Variables');
      }
      throw new Error(errorMessage);
    }
  }

  try {
    poolInstance = new Pool({
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
    
    if (!isBuildTime) {
      console.log('✅ PostgreSQL Pool created successfully');
    }
    return poolInstance;
  } catch (error) {
    console.error('❌ Failed to create PostgreSQL Pool:', error);
    console.error('Connection string (first 50 chars):', connectionString.substring(0, 50) + '...');
    throw new Error('Failed to initialize database pool.');
  }
};

// pool をエクスポート（getterとして実装）
export const pool = new Proxy({} as Pool, {
  get(_target, prop) {
    const pool = getPool();
    const value = (pool as any)[prop];
    if (typeof value === 'function') {
      return value.bind(pool);
    }
    return value;
  },
});

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


