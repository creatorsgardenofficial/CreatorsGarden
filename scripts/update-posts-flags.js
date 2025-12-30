/**
 * 特定ユーザーの投稿の優先表示フラグを更新するスクリプト
 * 
 * 使用方法:
 *   node scripts/update-posts-flags.js <user_id>
 * 
 * 例:
 *   node scripts/update-posts-flags.js 1764000000004
 */

const fs = require('fs');
const path = require('path');

const userId = process.argv[2];

if (!userId) {
  console.error('❌ エラー: ユーザーIDが必要です');
  console.log('\n使用方法:');
  console.log('  node scripts/update-posts-flags.js <user_id>');
  process.exit(1);
}

console.log('=== 投稿の優先表示フラグを更新 ===\n');
console.log(`ユーザーID: ${userId}\n`);

// ユーザーデータを読み込む
const usersPath = path.join(__dirname, '..', 'data', 'users.json');
let users = [];

try {
  const usersData = fs.readFileSync(usersPath, 'utf8');
  users = JSON.parse(usersData);
} catch (error) {
  console.error('❌ エラー: users.json を読み込めませんでした');
  console.error(error.message);
  process.exit(1);
}

// 該当するユーザーを検索
const user = users.find(u => u.id === userId);

if (!user) {
  console.error('❌ エラー: 該当するユーザーが見つかりませんでした');
  process.exit(1);
}

console.log(`✅ ユーザーが見つかりました:`);
console.log(`  - ユーザー名: ${user.username}`);
console.log(`  - 現在のプラン: ${user.subscription?.planType || 'free'}`);
console.log(`  - ステータス: ${user.subscription?.status || 'unknown'}\n`);

// プラン情報から優先表示フラグを決定
const planType = user.subscription?.planType || 'free';
const isActive = user.subscription?.status === 'active';
const shouldHavePriority = (planType === 'grow' || planType === 'bloom') && isActive;

console.log(`優先表示フラグの設定:`);
console.log(`  - priorityDisplay: ${shouldHavePriority}`);
console.log(`  - featuredDisplay: ${shouldHavePriority}\n`);

// 投稿データを読み込む
const postsPath = path.join(__dirname, '..', 'data', 'posts.json');
let posts = [];

try {
  const postsData = fs.readFileSync(postsPath, 'utf8');
  posts = JSON.parse(postsData);
} catch (error) {
  console.error('❌ エラー: posts.json を読み込めませんでした');
  console.error(error.message);
  process.exit(1);
}

// 該当ユーザーの投稿を更新
let updated = false;
let count = 0;

for (let i = 0; i < posts.length; i++) {
  if (posts[i].userId === userId) {
    const oldPriority = posts[i].priorityDisplay;
    const oldFeatured = posts[i].featuredDisplay;
    
    posts[i].priorityDisplay = shouldHavePriority;
    posts[i].featuredDisplay = shouldHavePriority;
    posts[i].updatedAt = new Date().toISOString();
    
    if (oldPriority !== shouldHavePriority || oldFeatured !== shouldHavePriority) {
      updated = true;
      count++;
    }
  }
}

if (updated) {
  // ファイルに保存
  fs.writeFileSync(postsPath, JSON.stringify(posts, null, 2), 'utf8');
  console.log(`✅ ${count}件の投稿を更新しました\n`);
} else {
  console.log('ℹ️  更新が必要な投稿はありませんでした\n');
}

// ユーザーのcancelAtPeriodEndも更新
const userIndex = users.findIndex(u => u.id === userId);
if (userIndex !== -1 && user.subscription) {
  if (user.subscription.status === 'canceled' && !user.subscription.cancelAtPeriodEnd) {
    users[userIndex].subscription.cancelAtPeriodEnd = true;
    fs.writeFileSync(usersPath, JSON.stringify(users, null, 2), 'utf8');
    console.log('✅ ユーザーのcancelAtPeriodEndを更新しました\n');
  }
}

console.log('🎉 更新完了！');
console.log('\n次に以下を確認してください:');
console.log('1. ブラウザでページをリロード');
console.log('2. プランページで「プラン情報を更新」ボタンをクリック');
console.log('3. プランが Seed Plan に切り替わっていることを確認');

