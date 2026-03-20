/**
 * Vercel Postgres接続文字列を解析して、TablePlusなどの接続情報を表示するスクリプト
 * 
 * 使用方法:
 * node scripts/parse-connection-string.js
 * 
 * または、接続文字列を直接指定:
 * node scripts/parse-connection-string.js "postgres://user:pass@host:port/db"
 */

const fs = require('fs');
const path = require('path');

// .env.localファイルを読み込む
function loadEnvLocal() {
  try {
    const envPath = path.join(__dirname, '..', '.env.local');
    const envFile = fs.readFileSync(envPath, 'utf8');
    envFile.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      
      const match = trimmed.match(/^([^=:#]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        let value = match[2].trim();
        if ((value.startsWith('"') && value.endsWith('"')) || 
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    });
  } catch (error) {
    // .env.localがない場合は無視
  }
}

// 接続文字列を解析
function parseConnectionString(connString) {
  try {
    // URL形式で解析
    const url = new URL(connString);
    
    // データベース名からクエリパラメータを除去
    let database = url.pathname.slice(1) || 'postgres';
    // クエリパラメータが含まれている場合（例: /dbname?sslmode=require）
    if (database.includes('?')) {
      database = database.split('?')[0];
    }
    
    // SSL設定を確認（Neon DBやVercel PostgresはSSL必須）
    const isNeonDb = url.hostname.includes('neon.tech');
    const isVercelPostgres = url.hostname.includes('pooler.supabase.com') || url.hostname.includes('vercel-storage.com');
    const sslMode = url.searchParams.get('sslmode') || (isNeonDb || isVercelPostgres ? 'require' : 'prefer');
    
    return {
      host: url.hostname,
      port: url.port || '5432',
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      database: database,
      ssl: isNeonDb || isVercelPostgres || sslMode === 'require' || sslMode === 'prefer',
      sslMode: sslMode,
    };
  } catch (error) {
    // URL形式でない場合、手動で解析
    // クエリパラメータを除去
    const cleanConnString = connString.split('?')[0];
    const match = cleanConnString.match(/postgres:\/\/([^:]+):([^@]+)@([^:]+):?(\d+)?\/(.+)/);
    if (match) {
      const database = match[5].split('?')[0]; // クエリパラメータを除去
      const isNeonDb = match[3].includes('neon.tech');
      const isVercelPostgres = match[3].includes('pooler.supabase.com') || match[3].includes('vercel-storage.com');
      
      return {
        user: match[1],
        password: match[2],
        host: match[3],
        port: match[4] || '5432',
        database: database,
        ssl: isNeonDb || isVercelPostgres,
        sslMode: isNeonDb || isVercelPostgres ? 'require' : 'prefer',
      };
    }
    return null;
  }
}

function main() {
  // .env.localを読み込む
  loadEnvLocal();
  
  // コマンドライン引数から接続文字列を取得、または環境変数から取得
  // CGDB_プレフィックス付きの環境変数にも対応
  const connectionString = process.argv[2] || 
                           process.env.CGDB_POSTGRES_URL_NON_POOLING ||
                           process.env.CGDB_DATABASE_URL_UNPOOLED ||
                           process.env.POSTGRES_URL_NON_POOLING ||
                           process.env.CGDB_POSTGRES_URL ||
                           process.env.CGDB_DATABASE_URL ||
                           process.env.POSTGRES_URL ||
                           process.env.POSTGRES_PRISMA_URL;
  
  if (!connectionString) {
    process.exit(1);
  }
  
  // Prisma Accelerateエンドポイントをチェック
  if (connectionString.includes('db.prisma.io') || connectionString.includes('accelerate.prisma.io')) {
    process.exit(1);
  }
  
  const parsed = parseConnectionString(connectionString);
  
  if (!parsed) {
    process.exit(1);
  }
  
  }

main();

