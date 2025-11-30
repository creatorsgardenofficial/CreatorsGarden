/**
 * マイグレーションスクリプトを実行する
 * 
 * 使用方法:
 * node scripts/run-migration.js scripts/migrate-group-chats.sql
 * 
 * 環境変数:
 * - POSTGRES_URL または POSTGRES_URL_NON_POOLING が必要です
 */

const fs = require('fs').promises;
const path = require('path');
const { Client } = require('pg');

async function runMigration(migrationFile) {
  try {
    console.log(`📖 マイグレーションファイル "${migrationFile}" を読み込んでいます...`);
    
    // マイグレーションファイルを読み込む
    const migrationPath = path.join(__dirname, migrationFile);
    const migrationSQL = await fs.readFile(migrationPath, 'utf-8');
    
    console.log('🚀 マイグレーションを実行しています...\n');
    
    // データベース接続
    const client = new Client({
      connectionString: process.env.POSTGRES_URL || process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_PRISMA_URL || process.env.PRISMA_DATABASE_URL
    });
    await client.connect();
    
    try {
      // SQLを実行
      await client.query(migrationSQL);
      console.log('✅ マイグレーションが完了しました！');
      
      // カラムが追加されたか確認（マイグレーションファイルに応じて）
      if (migrationFile.includes('migrate-posts-urls')) {
        const result = await client.query(`
          SELECT column_name, data_type 
          FROM information_schema.columns 
          WHERE table_name = 'posts' 
          AND column_name = 'urls'
        `);
        
        if (result.rows.length > 0) {
          console.log('\n追加されたカラム:');
          result.rows.forEach(row => {
            console.log(`  ✓ ${row.column_name} (${row.data_type})`);
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
          console.log('\n追加されたカラム:');
          result.rows.forEach(row => {
            console.log(`  ✓ ${row.column_name} (${row.data_type})`);
          });
        }
      }
      
    } finally {
      await client.end();
    }
    
  } catch (error) {
    console.error('\n❌ エラーが発生しました:', error);
    console.error('\nエラー詳細:');
    console.error('  Message:', error.message);
    console.error('  Code:', error.code);
    
    // "already exists"エラーは無視
    if (error.message && error.message.includes('already exists')) {
      console.log('\n⚠ カラムは既に存在しています（スキップ）');
      process.exit(0);
    }
    
    console.log('\n💡 トラブルシューティング:');
    console.log('   1. 環境変数 POSTGRES_URL が設定されているか確認してください');
    console.log('   2. データベースが正しく作成されているか確認してください');
    console.log('   3. Vercelダッシュボードで環境変数を確認してください');
    process.exit(1);
  }
}

// コマンドライン引数からマイグレーションファイルを取得
const migrationFile = process.argv[2] || 'scripts/migrate-group-chats.sql';

// 環境変数の確認
if (!process.env.POSTGRES_URL && !process.env.POSTGRES_URL_NON_POOLING && !process.env.POSTGRES_PRISMA_URL && !process.env.PRISMA_DATABASE_URL) {
  console.error('❌ エラー: 環境変数が設定されていません');
  console.error('\n以下のいずれかの環境変数が必要です:');
  console.error('  - POSTGRES_URL');
  console.error('  - POSTGRES_URL_NON_POOLING');
  console.error('  - POSTGRES_PRISMA_URL');
  console.error('  - PRISMA_DATABASE_URL');
  process.exit(1);
}

console.log('🔗 データベースに接続しています...\n');

runMigration(migrationFile);

