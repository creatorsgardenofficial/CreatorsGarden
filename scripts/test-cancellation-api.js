/**
 * Stripe APIを直接使用してサブスクリプションキャンセルをテストするスクリプト
 * 
 * Stripe CLIがインストールされていない場合でも使用できます。
 * 
 * 使用方法:
 *   node -r dotenv/config scripts/test-cancellation-api.js <subscription_id> dotenv_config_path=.env.local
 * 
 * 例:
 *   node -r dotenv/config scripts/test-cancellation-api.js sub_1SW750DJywW1BMn4NfPYOKpq dotenv_config_path=.env.local
 */

require('dotenv').config({ path: '.env.local' });

const Stripe = require('stripe');
const fs = require('fs');
const path = require('path');

// コマンドライン引数からサブスクリプションIDを取得
const subscriptionId = process.argv[2];

if (!subscriptionId) {
  console.error('❌ エラー: サブスクリプションIDが必要です');
  console.log('\n使用方法:');
  console.log('  node -r dotenv/config scripts/test-cancellation-api.js <subscription_id> dotenv_config_path=.env.local');
  console.log('\n例:');
  console.log('  node -r dotenv/config scripts/test-cancellation-api.js sub_xxxxxxxxxxxxx dotenv_config_path=.env.local');
  process.exit(1);
}

// サブスクリプションIDの形式チェック
if (!subscriptionId.startsWith('sub_')) {
  console.error('❌ エラー: 無効なサブスクリプションIDです');
  console.log('サブスクリプションIDは "sub_" で始まる必要があります');
  process.exit(1);
}

// Stripe APIキーの確認
if (!process.env.STRIPE_SECRET_KEY) {
  console.error('❌ エラー: STRIPE_SECRET_KEYが設定されていません');
  console.log('.env.localファイルにSTRIPE_SECRET_KEYを設定してください');
  process.exit(1);
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

console.log('=== サブスクリプションキャンセル・期間終了テスト（API使用） ===\n');
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

async function testCancellation() {
  try {
    // 1. サブスクリプションをキャンセル（期間終了時にキャンセル）
    console.log('1. サブスクリプションをキャンセル中（期間終了時にキャンセル）...');
    const canceledSubscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true
    });
    console.log('✅ キャンセル設定完了');
    console.log(`   - cancel_at_period_end: ${canceledSubscription.cancel_at_period_end}`);
    console.log(`   - current_period_end: ${new Date(canceledSubscription.current_period_end * 1000).toISOString()}\n`);
    
    // 2. 期間終了を過去に設定（テスト環境のみ）
    const pastTimestamp = Math.floor(Date.now() / 1000) - 86400; // 1日前
    console.log('2. 期間終了を過去に設定中...');
    try {
      await stripe.subscriptions.update(subscriptionId, {
        billing_cycle_anchor: pastTimestamp
      });
      console.log('✅ 期間終了設定完了\n');
    } catch (error) {
      console.log('⚠️  期間終了の設定に失敗しました（Stripeの制限により）');
      console.log('   代わりに、サブスクリプションを直接削除してテストします\n');
    }
    
    // 3. サブスクリプションを削除（期間終了をシミュレート）
    console.log('3. サブスクリプションを削除中（期間終了をシミュレート）...');
    const deletedSubscription = await stripe.subscriptions.cancel(subscriptionId);
    console.log('✅ サブスクリプション削除完了');
    console.log(`   - status: ${deletedSubscription.status}\n`);
    
    console.log('🎉 テスト完了！');
    console.log('\n⚠️  注意: このスクリプトはStripe APIを直接呼び出しますが、');
    console.log('   Webhookイベントは自動的に送信されません。');
    console.log('\n次に以下を確認してください:');
    console.log('1. Stripeダッシュボードでサブスクリプションが削除されていること');
    console.log('2. 本番環境のWebhookエンドポイントが設定されている場合、自動的にイベントが送信されます');
    console.log('3. ローカル開発環境の場合、Stripe CLIを使用するか、');
    console.log('   Stripeダッシュボードから手動でWebhookイベントを再送信してください');
    console.log('\nまたは、以下の方法でテストできます:');
    console.log('- Stripeダッシュボードから直接操作: TEST_WITHOUT_STRIPE_CLI.md を参照');
    console.log('- Stripe CLIをインストール: STRIPE_CLI_QUICK_INSTALL.md を参照');
    
  } catch (error) {
    console.error('\n❌ エラーが発生しました:');
    console.error(error.message);
    if (error.type === 'StripeAuthenticationError') {
      console.error('\nStripe APIキーが正しく設定されているか確認してください');
    } else if (error.type === 'StripeInvalidRequestError') {
      console.error('\nサブスクリプションIDが正しいか確認してください');
    }
    process.exit(1);
  }
}

testCancellation();

