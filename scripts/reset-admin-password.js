/**
 * 管理者アカウントのパスワードをリセットするスクリプト
 * 
 * 使用方法:
 * node scripts/reset-admin-password.js <新しいパスワード>
 * 
 * 例:
 * node scripts/reset-admin-password.js newpassword123
 */

const fs = require('fs').promises;
const path = require('path');
const bcrypt = require('bcryptjs');

const DATA_DIR = path.join(__dirname, '..', 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const ADMIN_EMAIL = 'creators.garden.official@gmail.com';

async function resetAdminPassword(newPassword) {
  try {
    // ユーザーデータを読み込む
    const usersData = await fs.readFile(USERS_FILE, 'utf-8');
    const users = JSON.parse(usersData);

    // 管理者ユーザーを検索
    const adminUser = users.find(u => u.email === ADMIN_EMAIL);

    if (!adminUser) {
      process.exit(1);
    }

    // パスワードをハッシュ化
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // パスワードを更新
    adminUser.password = hashedPassword;

    // ユーザーデータを保存
    await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');

    } catch (error) {
    process.exit(1);
  }
}

// コマンドライン引数を取得
const newPassword = process.argv[2];

if (!newPassword) {
  process.exit(1);
}

if (newPassword.length < 8) {
  process.exit(1);
}

resetAdminPassword(newPassword);

