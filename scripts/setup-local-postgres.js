/**
 * ローカルPostgreSQLデータベースのセットアップスクリプト
 * 
 * このスクリプトは、ローカルPostgreSQLデータベースへの接続をテストし、
 * 必要に応じてデータベースとスキーマを作成します。
 * 
 * 使用方法:
 *   node scripts/setup-local-postgres.js
 */

const { Client } = require('pg');
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
        // クォートを削除
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
    console.warn('⚠️  .env.localファイルを読み込めませんでした:', error.message);
  }
}

// PostgreSQL接続文字列を解析
function parseConnectionString(connString) {
  try {
    const url = new URL(connString);
    return {
      user: url.username,
      password: url.password,
      host: url.hostname,
      port: url.port || '5432',
      database: url.pathname.slice(1) || 'postgres',
    };
  } catch (error) {
    return null;
  }
}

async function testConnection(connectionString) {
  const client = new Client({ connectionString });
  try {
    await client.connect();
    const result = await client.query('SELECT version()');
    console.log('✅ PostgreSQL接続成功');
    console.log(`   バージョン: ${result.rows[0].version.split(' ')[0]} ${result.rows[0].version.split(' ')[1]}`);
    await client.end();
    return true;
  } catch (error) {
    console.error('❌ PostgreSQL接続失敗:', error.message);
    await client.end().catch(() => {});
    return false;
  }
}

async function createDatabaseIfNotExists(connectionString, dbName) {
  // postgresデータベースに接続してデータベースを作成
  const parsed = parseConnectionString(connectionString);
  if (!parsed) {
    console.error('❌ 接続文字列の解析に失敗しました');
    return false;
  }

  const adminConnString = `postgres://${parsed.user}:${parsed.password}@${parsed.host}:${parsed.port}/postgres`;
  const client = new Client({ connectionString: adminConnString });
  
  try {
    await client.connect();
    console.log(`📦 データベース "${dbName}" の存在を確認中...`);
    
    const checkResult = await client.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [dbName]
    );
    
    if (checkResult.rows.length === 0) {
      console.log(`📦 データベース "${dbName}" を作成中...`);
      await client.query(`CREATE DATABASE ${dbName}`);
      console.log(`✅ データベース "${dbName}" を作成しました`);
    } else {
      console.log(`✅ データベース "${dbName}" は既に存在します`);
    }
    
    await client.end();
    return true;
  } catch (error) {
    console.error(`❌ データベース作成エラー:`, error.message);
    await client.end().catch(() => {});
    return false;
  }
}

async function main() {
  console.log('🚀 ローカルPostgreSQLデータベースのセットアップを開始します...\n');
  
  // .env.localを読み込む
  loadEnvLocal();
  
  // 接続文字列を取得
  const connectionString = process.env.POSTGRES_URL || process.env.POSTGRES_URL_NON_POOLING;
  
  if (!connectionString) {
    console.error('❌ エラー: POSTGRES_URL または POSTGRES_URL_NON_POOLING が設定されていません');
    console.log('\n💡 解決方法:');
    console.log('   .env.localファイルに以下を追加してください:');
    console.log('   USE_DATABASE=true');
    console.log('   POSTGRES_URL=postgres://username:password@localhost:5432/database_name');
    process.exit(1);
  }
  
  // Prisma Accelerateエンドポイントをチェック
  if (connectionString.includes('db.prisma.io') || connectionString.includes('prisma.io')) {
    console.error('❌ エラー: Prisma Accelerateエンドポイントが検出されました');
    console.error('   ローカルPostgreSQLを使用するには、別の接続文字列が必要です');
    console.log('\n💡 解決方法:');
    console.log('   .env.localファイルのPOSTGRES_URLを以下の形式に変更してください:');
    console.log('   POSTGRES_URL=postgres://username:password@localhost:5432/database_name');
    process.exit(1);
  }
  
  const parsed = parseConnectionString(connectionString);
  if (!parsed) {
    console.error('❌ エラー: 接続文字列の形式が正しくありません');
    console.log('   正しい形式: postgres://username:password@host:port/database');
    process.exit(1);
  }
  
  console.log('📋 接続情報:');
  console.log(`   ホスト: ${parsed.host}`);
  console.log(`   ポート: ${parsed.port}`);
  console.log(`   データベース: ${parsed.database}`);
  console.log(`   ユーザー: ${parsed.user}\n`);
  
  // データベースが存在しない場合は作成
  if (parsed.database !== 'postgres') {
    const created = await createDatabaseIfNotExists(connectionString, parsed.database);
    if (!created) {
      console.error('❌ データベースの作成に失敗しました');
      process.exit(1);
    }
    console.log('');
  }
  
  // 接続テスト
  console.log('🔗 データベース接続をテスト中...');
  const connected = await testConnection(connectionString);
  
  if (!connected) {
    console.error('\n❌ データベースに接続できませんでした');
    console.log('\n💡 トラブルシューティング:');
    console.log('   1. PostgreSQLが起動しているか確認してください');
    console.log('   2. 接続文字列（ユーザー名、パスワード、ホスト、ポート、データベース名）が正しいか確認してください');
    console.log('   3. ファイアウォールでポート5432がブロックされていないか確認してください');
    process.exit(1);
  }
  
  console.log('\n✅ セットアップが完了しました！');
  console.log('\n📝 次のステップ:');
  console.log('   1. データベーススキーマを作成: npm run db:schema');
  console.log('   2. 開発サーバーを起動: npm run dev');
}

main().catch(error => {
  console.error('\n❌ 予期しないエラーが発生しました:', error);
  process.exit(1);
});

