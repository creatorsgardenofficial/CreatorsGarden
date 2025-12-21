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
    console.error('❌ エラー: 接続文字列が見つかりません');
    console.error('\n使用方法:');
    console.error('  1. 環境変数 POSTGRES_URL を設定');
    console.error('  2. または、引数として接続文字列を指定:');
    console.error('     node scripts/parse-connection-string.js "postgres://user:pass@host:port/db"');
    process.exit(1);
  }
  
  // Prisma Accelerateエンドポイントをチェック
  if (connectionString.includes('db.prisma.io') || connectionString.includes('accelerate.prisma.io')) {
    console.error('❌ エラー: Prisma Accelerateエンドポイントは直接接続できません');
    console.error('💡 Vercelダッシュボードから「Direct Connection」文字列を取得してください');
    process.exit(1);
  }
  
  const parsed = parseConnectionString(connectionString);
  
  if (!parsed) {
    console.error('❌ エラー: 接続文字列の解析に失敗しました');
    console.error('接続文字列:', connectionString.substring(0, 50) + '...');
    process.exit(1);
  }
  
  console.log('📋 データベース接続設定情報\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Name: Neon DB / Vercel Postgres (任意の名前)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Host:     ${parsed.host}`);
  console.log(`Port:     ${parsed.port}`);
  console.log(`User:     ${parsed.user}`);
  console.log(`Password: ${parsed.password}`);
  console.log(`Database: ${parsed.database}`);
  console.log(`SSL:      ${parsed.ssl ? `有効 (${parsed.sslMode || 'require'})` : '無効'}`);
  console.log('Role:     (空欄、またはUserと同じ)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  console.log('💡 pgAdminでの設定方法:');
  console.log('  1. pgAdminを起動');
  console.log('  2. 左側の「Servers」を右クリック → 「Register」 → 「Server...」');
  console.log('  3. 「General」タブ:');
  console.log('     - Name: Neon DB (任意の名前)');
  console.log('  4. 「Connection」タブ:');
  console.log(`     - Host name/address: ${parsed.host}`);
  console.log(`     - Port: ${parsed.port}`);
  console.log(`     - Maintenance database: ${parsed.database}`);
  console.log(`     - Username: ${parsed.user}`);
  console.log(`     - Password: ${parsed.password}`);
  console.log('  5. 「SSL」タブ:');
  console.log('     - SSL mode: 「Require」を選択');
  console.log('  6. 「Save」をクリック');
  console.log('  7. 接続をテスト\n');
  
  console.log('💡 TablePlusでの設定方法:');
  console.log('  1. TablePlusで「New Connection」をクリック');
  console.log('  2. PostgreSQLを選択');
  console.log('  3. 上記の情報を入力');
  console.log('  4. SSLタブ（またはAdvancedタブ）でSSLを有効化');
  console.log('  5. SSL Modeを「require」に設定');
  console.log('  6. 「Test」をクリックして接続を確認');
  console.log('  7. 「Save」をクリック\n');
}

main();




