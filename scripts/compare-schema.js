/**
 * ローカルデータベースのスキーマを取得して、schema.sqlと比較するスクリプト
 * 
 * 使用方法:
 * node scripts/compare-schema.js
 * 
 * 環境変数:
 * - POSTGRES_URL または POSTGRES_URL_NON_POOLING が必要です
 */

const fs = require('fs').promises;
const path = require('path');
const { Client } = require('pg');

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

// テーブルのカラム情報を取得
async function getTableColumns(client, tableName) {
  const result = await client.query(`
    SELECT 
      column_name,
      data_type,
      is_nullable,
      column_default,
      character_maximum_length
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = $1
    ORDER BY ordinal_position
  `, [tableName]);
  
  return result.rows;
}

// すべてのテーブルのスキーマを取得
async function getAllTablesSchema(client) {
  const tablesResult = await client.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `);
  
  const schema = {};
  
  for (const row of tablesResult.rows) {
    const tableName = row.table_name;
    const columns = await getTableColumns(client, tableName);
    schema[tableName] = columns;
  }
  
  return schema;
}

// スキーマを表示
function displaySchema(schema) {
  console.log('\n📋 ローカルデータベースのスキーマ:\n');
  console.log('='.repeat(80));
  
  for (const [tableName, columns] of Object.entries(schema)) {
    console.log(`\n📊 テーブル: ${tableName}`);
    console.log('-'.repeat(80));
    
    if (columns.length === 0) {
      console.log('  (カラムなし)');
      continue;
    }
    
    columns.forEach((col, index) => {
      const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
      const defaultVal = col.column_default ? ` DEFAULT ${col.column_default}` : '';
      const maxLength = col.character_maximum_length ? `(${col.character_maximum_length})` : '';
      
      console.log(`  ${index + 1}. ${col.column_name.padEnd(25)} ${col.data_type}${maxLength} ${nullable}${defaultVal}`);
    });
  }
  
  console.log('\n' + '='.repeat(80));
}

async function main() {
  try {
    // .env.localを読み込む
    loadEnvLocal();
    
    // 接続文字列を取得
    const connectionString = 
      process.env.CGDB_POSTGRES_URL_NON_POOLING ||
      process.env.CGDB_DATABASE_URL_UNPOOLED ||
      process.env.POSTGRES_URL_NON_POOLING ||
      process.env.CGDB_POSTGRES_URL ||
      process.env.CGDB_DATABASE_URL ||
      process.env.POSTGRES_URL;
    
    if (!connectionString) {
      console.error('❌ エラー: 接続文字列が見つかりません');
      console.error('\n以下のいずれかの環境変数が必要です:');
      console.error('  - CGDB_POSTGRES_URL_NON_POOLING');
      console.error('  - POSTGRES_URL_NON_POOLING');
      console.error('  - POSTGRES_URL');
      process.exit(1);
    }
    
    console.log('🔗 ローカルデータベースに接続しています...');
    
    // SSL設定
    const isNeonDb = connectionString.includes('neon.tech');
    const isVercelPostgres = connectionString.includes('pooler.supabase.com') || connectionString.includes('vercel-storage.com');
    const isLocalhost = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');
    
    const client = new Client({
      connectionString: connectionString,
      ssl: isLocalhost ? false : (isNeonDb || isVercelPostgres ? { rejectUnauthorized: false } : false)
    });
    
    await client.connect();
    console.log('✅ 接続成功\n');
    
    try {
      // スキーマを取得
      const schema = await getAllTablesSchema(client);
      
      // スキーマを表示
      displaySchema(schema);
      
      // 特にgroup_messagesテーブルを詳しく表示
      if (schema.group_messages) {
        console.log('\n🔍 group_messagesテーブルの詳細:');
        console.log('-'.repeat(80));
        schema.group_messages.forEach((col, index) => {
          const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
          const defaultVal = col.column_default ? ` DEFAULT ${col.column_default}` : '';
          console.log(`  ${index + 1}. ${col.column_name.padEnd(20)} ${col.data_type.padEnd(20)} ${nullable}${defaultVal}`);
        });
        console.log('-'.repeat(80));
      }
      
      console.log('\n✅ スキーマの取得が完了しました！');
      console.log('\n💡 schema.sqlと比較してください:');
      console.log('   - カラム数が同じか');
      console.log('   - カラム名が同じか');
      console.log('   - データ型が同じか');
      console.log('   - NULL制約が同じか');
      
    } finally {
      await client.end();
    }
    
  } catch (error) {
    console.error('\n❌ エラーが発生しました:', error.message);
    console.error('\nエラー詳細:');
    console.error('  Message:', error.message);
    console.error('  Code:', error.code);
    process.exit(1);
  }
}

main();

