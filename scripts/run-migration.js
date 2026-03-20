/**
 * マイグレーションスクリプトを実行する
 * 
 * 使用方法:
 * node scripts/run-migration.js scripts/migrate-group-chats.sql
 * 
 * 環境変数:
 * - POSTGRES_URL または POSTGRES_URL_NON_POOLING が必要です
 */

const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');
const { Client } = require('pg');

// .env.localファイルを読み込む（dotenvなしで）
try {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach(line => {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        const [key, ...valueParts] = trimmedLine.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').trim();
          if (!process.env[key.trim()]) {
            process.env[key.trim()] = value;
          }
        }
      }
    });
  }
} catch (error) {
  // .env.localファイルが存在しない場合は無視
}

async function runMigration(migrationFile) {
  try {
    // マイグレーションファイルを読み込む
    // migrationFileが既にscripts/を含んでいる場合はそのまま、そうでなければ追加
    const migrationPath = migrationFile.startsWith('scripts/') 
      ? path.join(__dirname, '..', migrationFile)
      : path.join(__dirname, migrationFile);
    const migrationSQL = await fsPromises.readFile(migrationPath, 'utf-8');
    
    // データベース接続（CGDB_プレフィックス付きの環境変数にも対応）
    const connectionString = 
      process.env.CGDB_POSTGRES_URL_NON_POOLING ||
      process.env.CGDB_DATABASE_URL_UNPOOLED ||
      process.env.POSTGRES_URL_NON_POOLING ||
      process.env.CGDB_POSTGRES_URL ||
      process.env.CGDB_DATABASE_URL ||
      process.env.POSTGRES_URL ||
      process.env.POSTGRES_PRISMA_URL ||
      process.env.PRISMA_DATABASE_URL;
    
    const client = new Client({
      connectionString: connectionString,
      ssl: connectionString?.includes('neon.tech') ? { rejectUnauthorized: false } : false
    });
    await client.connect();
    
    try {
      // SQLを実行
      await client.query(migrationSQL);
      // カラムが追加されたか確認（マイグレーションファイルに応じて）
      if (migrationFile.includes('migrate-posts-urls')) {
        const result = await client.query(`
          SELECT column_name, data_type 
          FROM information_schema.columns 
          WHERE table_name = 'posts' 
          AND column_name = 'urls'
        `);
        
        if (result.rows.length > 0) {
          result.rows.forEach(row => {
            });
        }
      } else if (migrationFile.includes('migrate-group-chats')) {
        const result = await client.query(`
          SELECT column_name, data_type 
          FROM information_schema.columns 
          WHERE table_name = 'group_chats' 
          AND column_name IN ('last_message_id', 'last_message_at')
          ORDER BY column_name
        `);
        
        if (result.rows.length > 0) {
          result.rows.forEach(row => {
            });
        }
      } else if (migrationFile.includes('add-bumped-at-column')) {
        const result = await client.query(`
          SELECT column_name, data_type 
          FROM information_schema.columns 
          WHERE table_name = 'posts' 
          AND column_name = 'bumped_at'
        `);
        
        if (result.rows.length > 0) {
          result.rows.forEach(row => {
            });
        }
      }
      
    } finally {
      await client.end();
    }
    
  } catch (error) {
    // "already exists"エラーは無視
    if (error.message && error.message.includes('already exists')) {
      process.exit(0);
    }
    
    process.exit(1);
  }
}

// コマンドライン引数からマイグレーションファイルを取得
const migrationFile = process.argv[2] || 'scripts/migrate-group-chats.sql';

// 環境変数の確認（CGDB_プレフィックス付きにも対応）
const connectionString = 
  process.env.CGDB_POSTGRES_URL_NON_POOLING ||
  process.env.CGDB_DATABASE_URL_UNPOOLED ||
  process.env.POSTGRES_URL_NON_POOLING ||
  process.env.CGDB_POSTGRES_URL ||
  process.env.CGDB_DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.PRISMA_DATABASE_URL;

if (!connectionString) {
  process.exit(1);
}

runMigration(migrationFile);

