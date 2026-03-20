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
    // スキーマファイルを読み込む
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schemaSQL = await fs.readFile(schemaPath, 'utf-8');
    
    // SQL文を分割
    const statements = splitSQLStatements(schemaSQL);
    // データベース接続を1つだけ作成して再利用
    // CGDB_プレフィックス付きの環境変数にも対応
    const connectionString = 
      process.env.CGDB_POSTGRES_URL_NON_POOLING ||
      process.env.CGDB_DATABASE_URL_UNPOOLED ||
      process.env.POSTGRES_URL_NON_POOLING ||
      process.env.CGDB_POSTGRES_URL ||
      process.env.CGDB_DATABASE_URL ||
      process.env.POSTGRES_URL;
    
    const client = new Client({
      connectionString: connectionString,
      ssl: connectionString?.includes('neon.tech') ? { rejectUnauthorized: false } : false
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
              }
          } else if (statement.toUpperCase().includes('CREATE INDEX')) {
            const indexMatch = statement.match(/CREATE INDEX\s+(?:IF NOT EXISTS\s+)?(\w+)/i);
            if (indexMatch) {
              }
          }
        } catch (error) {
          // "already exists"エラーは無視（IF NOT EXISTSを使用しているため）
          if (error.message && error.message.includes('already exists')) {
            } else {
            throw error;
          }
        }
      }
      
      // テーブル一覧を取得
      const result = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        ORDER BY table_name
      `);
      
      const tables = { rows: result.rows };
      
      tables.rows.forEach(row => {
        });
      
      } finally {
      await client.end();
    }
    
  } catch (error) {
    process.exit(1);
  }
}

// 環境変数の確認（CGDB_プレフィックス付きにも対応）
const connectionString = 
  process.env.CGDB_POSTGRES_URL_NON_POOLING ||
  process.env.CGDB_DATABASE_URL_UNPOOLED ||
  process.env.POSTGRES_URL_NON_POOLING ||
  process.env.CGDB_POSTGRES_URL ||
  process.env.CGDB_DATABASE_URL ||
  process.env.POSTGRES_URL;

if (!connectionString) {
  process.exit(1);
}

// 使用している環境変数名を特定
const envVarName = 
  process.env.CGDB_POSTGRES_URL_NON_POOLING ? 'CGDB_POSTGRES_URL_NON_POOLING' :
  process.env.CGDB_DATABASE_URL_UNPOOLED ? 'CGDB_DATABASE_URL_UNPOOLED' :
  process.env.POSTGRES_URL_NON_POOLING ? 'POSTGRES_URL_NON_POOLING' :
  process.env.CGDB_POSTGRES_URL ? 'CGDB_POSTGRES_URL' :
  process.env.CGDB_DATABASE_URL ? 'CGDB_DATABASE_URL' :
  'POSTGRES_URL';

runSchema();

