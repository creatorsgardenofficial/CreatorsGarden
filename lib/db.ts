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

// カスタムプレフィックス（STORAGEなど）が設定されている場合も対応
// POSTGRES_PRISMA_URLを優先的に使用し、なければPOSTGRES_URLをフォールバックとして使用
const prismaUrl = 
  process.env.POSTGRES_PRISMA_URL || 
  process.env.PRISMA_DATABASE_URL ||
  process.env.STORAGE_PRISMA_URL || // カスタムプレフィックス対応
  process.env.STORAGE_URL || // カスタムプレフィックスの直接接続URL
  process.env.POSTGRES_URL; // フォールバック: 直接接続URL（動作しない可能性があるが試す）
const isVercelEnvironment = process.env.VERCEL === '1' || process.env.VERCEL_ENV !== undefined;

// デバッグ: 環境変数の状態をログ出力（本番環境のみ）
if (isVercelEnvironment) {
  console.log('🔍 Database environment variables check:');
  console.log('  POSTGRES_PRISMA_URL:', !!process.env.POSTGRES_PRISMA_URL);
  console.log('  PRISMA_DATABASE_URL:', !!process.env.PRISMA_DATABASE_URL);
  console.log('  STORAGE_PRISMA_URL:', !!process.env.STORAGE_PRISMA_URL);
  console.log('  STORAGE_URL:', !!process.env.STORAGE_URL);
  console.log('  POSTGRES_URL:', !!process.env.POSTGRES_URL);
  console.log('  Using connection string:', prismaUrl ? 'Found' : 'Not found');
  if (prismaUrl) {
    console.log('  Connection string format:', prismaUrl.startsWith('prisma+postgres://') ? 'prisma+postgres://' : 
                                                      prismaUrl.startsWith('postgres://') ? 'postgres://' : 'unknown');
  }
}

if (prismaUrl) {
  // PRISMA_DATABASE_URLが設定されている場合、POSTGRES_PRISMA_URLとしても設定する
  // @vercel/postgresのsqlタグはPOSTGRES_PRISMA_URLを自動的に探す
  if (process.env.PRISMA_DATABASE_URL && !process.env.POSTGRES_PRISMA_URL) {
    // prisma+postgres://形式の場合は、postgres://形式に変換
    let connectionString = process.env.PRISMA_DATABASE_URL;
    if (connectionString.startsWith('prisma+postgres://')) {
      connectionString = connectionString.replace('prisma+postgres://', 'postgres://');
      console.log('⚠️  Converting prisma+postgres:// to postgres:// format');
    }
    // 環境変数として設定（このセッションでのみ有効）
    // 注意: 実行時に環境変数を設定しても、@vercel/postgresのsqlタグが認識しない可能性がある
    process.env.POSTGRES_PRISMA_URL = connectionString;
    console.log('✅ Set POSTGRES_PRISMA_URL from PRISMA_DATABASE_URL');
  }
  
  // デフォルトのsqlタグを使用（環境変数を自動的に探す）
  // @vercel/postgresのsqlタグはPOSTGRES_PRISMA_URLを優先的に探す
  // createClient()を使わないことで、this.queryエラーを回避
  sqlInstance = defaultSql;
  console.log('✅ Using default sql tag (will use POSTGRES_PRISMA_URL automatically)');
} else if (isVercelEnvironment) {
  // 本番環境でPOSTGRES_PRISMA_URLが設定されていない場合
  // @vercel/postgresのsqlタグは自動的に環境変数を探しますが、
  // POSTGRES_PRISMA_URLが設定されていない場合はエラーが発生します
  // カスタムプレフィックス（STORAGEなど）が設定されている場合、STORAGE_PRISMA_URLもチェック
  console.error('⚠️  POSTGRES_PRISMA_URL or STORAGE_PRISMA_URL is not set in production environment.');
  console.error('   Please configure POSTGRES_PRISMA_URL in Vercel dashboard.');
  console.error('   Or if using custom prefix, ensure STORAGE_PRISMA_URL is set.');
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
    console.log('✅ Database connection test successful');
    return true;
  } catch (error: any) {
    console.error('❌ Database connection test failed:', error);
    console.error('Error code:', error?.code);
    console.error('Error message:', error?.message);
    console.error('Error name:', error?.name);
    console.error('Error stack:', error?.stack);
    // より詳細なエラー情報をログ出力
    if (error?.code === 'missing_connection_string') {
      console.error('⚠️  Connection string is missing. Check environment variables.');
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

export { sqlInstance as sql };
