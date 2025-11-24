/**
 * サブスクリプションキャンセル・期間終了テスト用スクリプト
 * 
 * このスクリプトは、期間終了時のFreeプランへの自動切り替えをテストするためのヘルパースクリプトです。
 * 
 * 使用方法:
 * 1. まず、実際のサブスクリプションIDを取得してください
 * 2. 以下のコマンドを実行:
 *    node scripts/test-subscription-cancellation.js <subscription_id>
 * 
 * 注意: このスクリプトはStripe CLIを使用してWebhookイベントを送信します。
 * Stripe CLIがインストールされ、ログインしている必要があります。
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// コマンドライン引数からサブスクリプションIDを取得
const subscriptionId = process.argv[2];

if (!subscriptionId) {
  console.error('❌ エラー: サブスクリプションIDが必要です');
  console.log('\n使用方法:');
  console.log('  node scripts/test-subscription-cancellation.js <subscription_id>');
  console.log('\n例:');
  console.log('  node scripts/test-subscription-cancellation.js sub_xxxxxxxxxxxxx');
  process.exit(1);
}

// サブスクリプションIDの形式チェック
if (!subscriptionId.startsWith('sub_')) {
  console.error('❌ エラー: 無効なサブスクリプションIDです');
  console.log('サブスクリプションIDは "sub_" で始まる必要があります');
  process.exit(1);
}

console.log('=== サブスクリプションキャンセル・期間終了テスト ===\n');
console.log(`サブスクリプションID: ${subscriptionId}\n`);

// ユーザーデータを読み込んで、該当するサブスクリプションを検索
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
const user = users.find(u => u.subscription?.stripeSubscriptionId === subscriptionId);

if (!user) {
  console.warn('⚠️  警告: 該当するユーザーが見つかりませんでした');
  console.log('サブスクリプションIDが正しいか確認してください\n');
} else {
  console.log(`✅ ユーザーが見つかりました:`);
  console.log(`  - ユーザーID: ${user.id}`);
  console.log(`  - ユーザー名: ${user.username}`);
  console.log(`  - 現在のプラン: ${user.subscription?.planType || 'free'}`);
  console.log(`  - ステータス: ${user.subscription?.status || 'unknown'}\n`);
}

console.log('以下のコマンドを実行してテストできます:\n');

// 1. サブスクリプションをキャンセル（期間終了時にキャンセル）
console.log('1. サブスクリプションをキャンセル（期間終了時にキャンセル）:');
console.log(`   stripe subscriptions update ${subscriptionId} --cancel-at-period-end\n`);

// 2. 期間終了をシミュレート（current_period_endを過去の日付に設定）
const pastTimestamp = Math.floor(Date.now() / 1000) - 86400; // 1日前
console.log('2. 期間終了をシミュレート（current_period_endを過去の日付に設定）:');
console.log(`   stripe subscriptions update ${subscriptionId} --billing-cycle-anchor ${pastTimestamp}\n`);

// 3. customer.subscription.updated イベントを手動で送信
console.log('3. customer.subscription.updated イベントを手動で送信（status: canceled）:');
console.log(`   stripe trigger customer.subscription.updated \\`);
console.log(`     --override subscription:id=${subscriptionId} \\`);
console.log(`     --override subscription:status=canceled \\`);
console.log(`     --override subscription:cancel_at_period_end=true \\`);
console.log(`     --override subscription:current_period_end=${pastTimestamp}\n`);

// 4. customer.subscription.deleted イベントを手動で送信
console.log('4. customer.subscription.deleted イベントを手動で送信:');
console.log(`   stripe trigger customer.subscription.deleted \\`);
console.log(`     --override subscription:id=${subscriptionId}\n`);

console.log('---\n');
console.log('📝 注意事項:');
console.log('1. Stripe CLIがインストールされ、ログインしている必要があります');
console.log('2. 開発サーバーが起動している必要があります');
console.log('3. Stripe CLIでWebhookを転送している必要があります:');
console.log('   stripe listen --forward-to localhost:3000/api/stripe/webhook');
console.log('\n');

// インタラクティブモード（オプション）
const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Stripe CLIがインストールされているか確認
let stripeCliAvailable = false;
try {
  execSync('stripe --version', { stdio: 'ignore' });
  stripeCliAvailable = true;
} catch (error) {
  stripeCliAvailable = false;
}

if (!stripeCliAvailable) {
  console.log('\n⚠️  Stripe CLIがインストールされていません。');
  console.log('\n以下の方法でテストできます:');
  console.log('1. Stripeダッシュボードから直接操作（推奨）');
  console.log('   - 詳細: TEST_WITHOUT_STRIPE_CLI.md を参照');
  console.log('2. Stripe CLIをインストール');
  console.log('   - 詳細: STRIPE_CLI_QUICK_INSTALL.md を参照');
  console.log('\n現在のサブスクリプション情報:');
  console.log(`   - サブスクリプションID: ${subscriptionId}`);
  console.log(`   - Stripeダッシュボード: https://dashboard.stripe.com/test/subscriptions/${subscriptionId}`);
  rl.close();
  process.exit(0);
}

rl.question('上記のコマンドを自動実行しますか？ (y/n): ', (answer) => {
  if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
    console.log('\n自動実行を開始します...\n');
    
    try {
      // 1. サブスクリプションをキャンセル
      console.log('1. サブスクリプションをキャンセル中...');
      execSync(`stripe subscriptions update ${subscriptionId} --cancel-at-period-end`, { stdio: 'inherit' });
      console.log('✅ キャンセル設定完了\n');
      
      // 2. 期間終了をシミュレート
      console.log('2. 期間終了をシミュレート中...');
      execSync(`stripe subscriptions update ${subscriptionId} --billing-cycle-anchor ${pastTimestamp}`, { stdio: 'inherit' });
      console.log('✅ 期間終了設定完了\n');
      
      // 3. customer.subscription.updated イベントを送信
      console.log('3. customer.subscription.updated イベントを送信中...');
      execSync(`stripe trigger customer.subscription.updated --override subscription:id=${subscriptionId} --override subscription:status=canceled --override subscription:cancel_at_period_end=true --override subscription:current_period_end=${pastTimestamp}`, { stdio: 'inherit' });
      console.log('✅ イベント送信完了\n');
      
      console.log('🎉 テスト完了！');
      console.log('\n次に以下を確認してください:');
      console.log('1. サーバーログで「Webhook: Free Planへの切り替え完了」が表示されること');
      console.log('2. data/users.json で planType が "free" になっていること');
      console.log('3. アプリケーションでプランが Free Plan に切り替わっていること');
      
    } catch (error) {
      console.error('\n❌ エラーが発生しました:');
      console.error(error.message);
      console.log('\n手動でコマンドを実行するか、Stripeダッシュボードから操作してください。');
      console.log('詳細: TEST_WITHOUT_STRIPE_CLI.md を参照');
    }
  } else {
    console.log('\n手動でコマンドを実行してください。');
  }
  
  rl.close();
});

