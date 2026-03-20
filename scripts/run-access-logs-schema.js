const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

/**
 * access_logsテーブルを作成するスクリプト
 * ローカル環境で実行: node scripts/run-access-logs-schema.js
 */

async function runAccessLogsSchema() {
  try {
    // 環境変数から接続文字列を取得
    const connectionString = process.env.POSTGRES_URL_NON_POOLING 
      || process.env.DATABASE_URL 
      || process.env.CGDB_POSTGRES_URL_NON_POOLING
      || process.env.STORAGE_POSTGRES_URL_NON_POOLING;

    if (!connectionString) {
      process.exit(1);
    }

    // PostgreSQL接続プールを作成
    const pool = new Pool({
      connectionString,
      ssl: connectionString.includes('sslmode=require') || connectionString.includes('ssl=true') 
        ? { rejectUnauthorized: false } 
        : false
    });

    // SQLファイルを読み込む
    const sqlFile = path.join(__dirname, 'add-access-logs-table.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');

    // SQL文を分割（セミコロンで区切る）
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    // 各SQL文を実行
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      try {
        await pool.query(statement + ';');
        
        if (statement.toUpperCase().includes('CREATE TABLE')) {
          } else if (statement.toUpperCase().includes('CREATE INDEX')) {
          const indexMatch = statement.match(/CREATE INDEX\s+(?:IF NOT EXISTS\s+)?(\w+)/i);
          if (indexMatch) {
            }
        } else if (statement.toUpperCase().includes('COMMENT')) {
          }
      } catch (error) {
        // "already exists"エラーは無視（IF NOT EXISTSを使用しているため）
        if (error.message && error.message.includes('already exists')) {
          } else {
          throw error;
        }
      }
    }

    // テーブルが正しく作成されたか確認
    const result = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'access_logs'
      ORDER BY ordinal_position
    `);

    result.rows.forEach(row => {
      });

    await pool.end();
    } catch (error) {
    process.exit(1);
  }
}

runAccessLogsSchema();

