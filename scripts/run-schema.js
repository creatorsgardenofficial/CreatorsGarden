/**
 * データベーススキーマを実行するスクリプト
 * 
 * 使用方法:
 * node scripts/run-schema.js
 * 
 * 環境変数:
 * - POSTGRES_URL または POSTGRES_URL_NON_POOLING が必要です
 */

const fs = require('fs').promises;
const path = require('path');
const { Client } = require('pg');

// SQL文を分割する関数（より単純な方法：行単位で処理）
function splitSQLStatements(sqlText) {
  const statements = [];
  const lines = sqlText.split('\n');
  let currentStatement = '';
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // 空行やコメント行をスキップ
    if (!trimmedLine || trimmedLine.startsWith('--')) {
      continue;
    }
    
    currentStatement += line + '\n';
    
    // セミコロンで終わる行を見つけたら、ステートメントを完成
    if (trimmedLine.endsWith(';')) {
      const trimmed = currentStatement.trim();
      if (trimmed && trimmed !== ';') {
        statements.push(trimmed);
      }
      currentStatement = '';
    }
  }
  
  // 最後のステートメント（セミコロンがない場合）
  const trimmed = currentStatement.trim();
  if (trimmed) {
    statements.push(trimmed);
  }
  
  return statements.filter(s => s.length > 0 && !s.startsWith('--'));
}

async function runSchema() {
  try {
    console.log('📖 スキーマファイルを読み込んでいます...');
    
    // スキーマファイルを読み込む
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schemaSQL = await fs.readFile(schemaPath, 'utf-8');
    
    // SQL文を分割
    const statements = splitSQLStatements(schemaSQL);
    console.log(`📝 ${statements.length}個のSQL文を検出しました。\n`);
    
    console.log('🚀 データベーススキーマを実行しています...\n');
    
    // データベース接続を1つだけ作成して再利用
    const client = new Client({
      connectionString: process.env.POSTGRES_URL || process.env.POSTGRES_URL_NON_POOLING
    });
    await client.connect();
    
    try {
      // 各SQL文を個別に実行
      for (let i = 0; i < statements.length; i++) {
        const statement = statements[i].trim();
        if (!statement || statement.startsWith('--')) {
          continue; // 空行やコメントをスキップ
        }
        
        try {
          // SQLを実行
          await client.query(statement);
          
          // テーブル作成の場合は成功メッセージを表示
          if (statement.toUpperCase().includes('CREATE TABLE')) {
            const tableMatch = statement.match(/CREATE TABLE\s+(?:IF NOT EXISTS\s+)?(\w+)/i);
            if (tableMatch) {
              console.log(`  ✓ テーブル "${tableMatch[1]}" を作成しました`);
            }
          } else if (statement.toUpperCase().includes('CREATE INDEX')) {
            const indexMatch = statement.match(/CREATE INDEX\s+(?:IF NOT EXISTS\s+)?(\w+)/i);
            if (indexMatch) {
              console.log(`  ✓ インデックス "${indexMatch[1]}" を作成しました`);
            }
          }
        } catch (error) {
          // "already exists"エラーは無視（IF NOT EXISTSを使用しているため）
          if (error.message && error.message.includes('already exists')) {
            console.log(`  ⚠ 既に存在しています（スキップ）`);
          } else {
            console.error(`  ❌ エラー (${i + 1}/${statements.length}): ${error.message}`);
            console.error(`   SQL: ${statement.substring(0, 100)}...`);
            throw error;
          }
        }
      }
      
      console.log('\n✅ スキーマの実行が完了しました！');
      console.log('\n📋 作成されたテーブルを確認中...\n');
      
      // テーブル一覧を取得
      const result = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        ORDER BY table_name
      `);
      
      const tables = { rows: result.rows };
      
      console.log('作成されたテーブル:');
      tables.rows.forEach(row => {
        console.log(`  ✓ ${row.table_name}`);
      });
      
      console.log(`\n合計: ${tables.rows.length}個のテーブルが作成されました。`);
      
    } finally {
      await client.end();
    }
    
  } catch (error) {
    console.error('\n❌ エラーが発生しました:', error);
    console.error('\nエラー詳細:');
    console.error('  Message:', error.message);
    console.error('  Code:', error.code);
    
    console.log('\n💡 トラブルシューティング:');
    console.log('   1. 環境変数 POSTGRES_URL が設定されているか確認してください');
    console.log('   2. データベースが正しく作成されているか確認してください');
    console.log('   3. Vercelダッシュボードで環境変数を確認してください');
    console.log('   4. pgパッケージが必要な場合: npm install pg');
    process.exit(1);
  }
}

// 環境変数の確認
if (!process.env.POSTGRES_URL && !process.env.POSTGRES_URL_NON_POOLING) {
  console.error('❌ エラー: 環境変数が設定されていません');
  console.error('\n以下のいずれかの環境変数が必要です:');
  console.error('  - POSTGRES_URL');
  console.error('  - POSTGRES_URL_NON_POOLING');
  console.error('\n💡 解決方法:');
  console.error('   1. Vercelダッシュボードで環境変数を確認');
  console.error('   2. .env.local ファイルに環境変数を追加');
  console.error('   3. または、環境変数を直接設定:');
  console.error('      $env:POSTGRES_URL="postgres://..."  # PowerShell');
  console.error('      export POSTGRES_URL="postgres://..."  # Bash');
  process.exit(1);
}

console.log('🔗 データベースに接続しています...');
console.log(`   環境変数: ${process.env.POSTGRES_URL ? 'POSTGRES_URL' : 'POSTGRES_URL_NON_POOLING'}\n`);

runSchema();

