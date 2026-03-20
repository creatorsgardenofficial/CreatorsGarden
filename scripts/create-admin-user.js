/**
 * 管理者ユーザーを作成するスクリプト
 * 
 * 使用方法:
 * 1. 環境変数を設定:
 *    ADMIN_EMAIL=admin@example.com
 *    ADMIN_PASSWORD=your-password
 *    ADMIN_USERNAME=管理者
 * 
 * 2. スクリプトを実行:
 *    node scripts/create-admin-user.js
 * 
 * または、コマンドライン引数で指定:
 *    node scripts/create-admin-user.js admin@example.com your-password "管理者"
 */

// dotenvがインストールされている場合は使用（オプション）
try {
  require('dotenv').config({ path: '.env.local' });
} catch (e) {
  // dotenvがインストールされていない場合は無視
}

const { Client } = require('pg');
const bcrypt = require('bcryptjs');
const fs = require('fs').promises;
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

// データベースが利用可能かチェック
function isDatabaseAvailable() {
  return !!(
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL_NON_POOLING
  );
}

// データベースを使用すべきかチェック
function shouldUseDatabase() {
  if (isDatabaseAvailable()) {
    return process.env.USE_DATABASE === 'true' || 
           process.env.VERCEL === '1' || 
           process.env.VERCEL_ENV !== undefined;
  }
  return false;
}

// ランダムな表示用IDを生成（8文字の英数字）
function generatePublicId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// データベースに管理者ユーザーを作成
async function createAdminUserInDatabase(email, password, username) {
  const connectionString = process.env.POSTGRES_URL || 
                          process.env.POSTGRES_URL_NON_POOLING || 
                          process.env.POSTGRES_PRISMA_URL;
  
  if (!connectionString) {
    throw new Error('データベース接続文字列が設定されていません');
  }

  const client = new Client({
    connectionString: connectionString,
  });

  try {
    await client.connect();
    
    // 既存のユーザーをチェック
    const existingUserResult = await client.query(
      'SELECT id, email FROM users WHERE email = $1 LIMIT 1',
      [email]
    );
    
    if (existingUserResult.rows.length > 0) {
      const hashedPassword = await bcrypt.hash(password, 10);
      await client.query(
        'UPDATE users SET password = $1, username = $2 WHERE email = $3',
        [hashedPassword, username, email]
      );
      return;
    }

    // パスワードをハッシュ化
    const hashedPassword = await bcrypt.hash(password, 10);
    const publicId = generatePublicId();
    const id = Date.now().toString();
    const createdAt = new Date().toISOString();
    const subscription = { planType: 'free', status: 'active' };

    // ユーザーを作成
    await client.query(
      `INSERT INTO users (
        id, username, email, password, creator_type, bio, portfolio_urls,
        is_active, public_id, created_at, subscription
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        id,
        username,
        email,
        hashedPassword,
        'other',
        null,
        null,
        true,
        publicId,
        createdAt,
        JSON.stringify(subscription)
      ]
    );

    } catch (error) {
    throw error;
  } finally {
    await client.end();
  }
}

// ファイルシステムに管理者ユーザーを作成
async function createAdminUserInFileSystem(email, password, username) {
  try {
    // データディレクトリの作成
    await fs.mkdir(DATA_DIR, { recursive: true });

    // 既存のユーザーを読み込む
    let users = [];
    try {
      const data = await fs.readFile(USERS_FILE, 'utf-8');
      users = JSON.parse(data);
    } catch {
      // ファイルが存在しない場合は空配列
      users = [];
    }

    // 既存のユーザーをチェック
    const existingUser = users.find(u => u.email === email);
    if (existingUser) {
      const hashedPassword = await bcrypt.hash(password, 10);
      existingUser.password = hashedPassword;
      existingUser.username = username;
      await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
      return;
    }

    // パスワードをハッシュ化
    const hashedPassword = await bcrypt.hash(password, 10);
    const publicId = generatePublicId();
    const id = Date.now().toString();
    const createdAt = new Date().toISOString();

    // 新しいユーザーを作成
    const newUser = {
      id,
      username,
      email,
      password: hashedPassword,
      creatorType: 'other',
      bio: undefined,
      portfolioUrls: undefined,
      isActive: true,
      publicId,
      subscription: {
        planType: 'free',
        status: 'active',
      },
      createdAt,
    };

    users.push(newUser);
    await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');

    } catch (error) {
    throw error;
  }
}

// メイン処理
async function main() {
  // コマンドライン引数または環境変数から取得
  const email = process.argv[2] || process.env.ADMIN_EMAIL;
  const password = process.argv[3] || process.env.ADMIN_PASSWORD;
  const username = process.argv[4] || process.env.ADMIN_USERNAME || '管理者';

  // バリデーション
  if (!email) {
    process.exit(1);
  }

  if (!password) {
    process.exit(1);
  }

  if (password.length < 8) {
    process.exit(1);
  }

  // メールアドレスの形式チェック
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    process.exit(1);
  }

  try {
    // データベースまたはファイルシステムに作成
    if (shouldUseDatabase() || isDatabaseAvailable()) {
      await createAdminUserInDatabase(email, password, username);
    } else {
      await createAdminUserInFileSystem(email, password, username);
    }

    // 管理者メールアドレスの確認
    const adminEmails = process.env.ADMIN_EMAILS?.split(',').map(e => e.trim()) || [];
    const defaultAdminEmails = ['creators.garden.official@gmail.com'];
    const allAdminEmails = [...adminEmails, ...defaultAdminEmails];
    
    if (allAdminEmails.includes(email)) {
      } else {
      }
  } catch (error) {
    process.exit(1);
  }
}

main();

