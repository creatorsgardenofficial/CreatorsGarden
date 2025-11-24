/**
 * Stripe APIから直接サブスクリプション情報を取得して、データベースを更新するスクリプト
 * 
 * Webhookが届かない場合でも、手動でサブスクリプションの状態を同期できます。
 * 
 * 使用方法:
 *   node -r dotenv/config scripts/sync-subscription-status.js <subscription_id> dotenv_config_path=.env.local
 * 
 * 例:
 *   node -r dotenv/config scripts/sync-subscription-status.js sub_1SW750DJywW1BMn4NfPYOKpq dotenv_config_path=.env.local
 */

// 環境変数を読み込む（.env.localファイルから）
const fs = require('fs');
const path = require('path');

try {
  const envPath = path.join(__dirname, '..', '.env.local');
  const envFile = fs.readFileSync(envPath, 'utf8');
  envFile.split('\n').forEach(line => {
    const match = line.match(/^([^=:#]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim().replace(/^["']|["']$/g, '');
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  });
} catch (error) {
  console.warn('⚠️  .env.localファイルを読み込めませんでした');
}

const Stripe = require('stripe');

// コマンドライン引数からサブスクリプションIDを取得
const subscriptionId = process.argv[2];

if (!subscriptionId) {
  console.error('❌ エラー: サブスクリプションIDが必要です');
  console.log('\n使用方法:');
  console.log('  node -r dotenv/config scripts/sync-subscription-status.js <subscription_id> dotenv_config_path=.env.local');
  console.log('\n例:');
  console.log('  node -r dotenv/config scripts/sync-subscription-status.js sub_xxxxxxxxxxxxx dotenv_config_path=.env.local');
  process.exit(1);
}

// Stripe APIキーの確認
if (!process.env.STRIPE_SECRET_KEY) {
  console.error('❌ エラー: STRIPE_SECRET_KEYが設定されていません');
  console.log('.env.localファイルにSTRIPE_SECRET_KEYを設定してください');
  process.exit(1);
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

console.log('=== サブスクリプション状態の同期 ===\n');
console.log(`サブスクリプションID: ${subscriptionId}\n`);

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
const user = users.find(u => u.subscription?.stripeSubscriptionId === subscriptionId);

if (!user) {
  console.error('❌ エラー: 該当するユーザーが見つかりませんでした');
  console.log('サブスクリプションIDが正しいか確認してください');
  process.exit(1);
}

console.log(`✅ ユーザーが見つかりました:`);
console.log(`  - ユーザーID: ${user.id}`);
console.log(`  - ユーザー名: ${user.username}`);
console.log(`  - 現在のプラン: ${user.subscription?.planType || 'free'}`);
console.log(`  - 現在のステータス: ${user.subscription?.status || 'unknown'}\n`);

async function syncSubscription() {
  try {
    // Stripeからサブスクリプション情報を取得
    console.log('Stripeからサブスクリプション情報を取得中...');
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    
    console.log('✅ サブスクリプション情報を取得しました:');
    console.log(`  - ステータス: ${subscription.status}`);
    console.log(`  - cancel_at_period_end: ${subscription.cancel_at_period_end}`);
    console.log(`  - current_period_end: ${new Date(subscription.current_period_end * 1000).toISOString()}\n`);
    
    // 価格IDからplanTypeを取得
    const priceId = subscription.items.data[0]?.price?.id;
    const growPriceId = process.env.STRIPE_PRICE_ID_GROW;
    const bloomPriceId = process.env.STRIPE_PRICE_ID_BLOOM;
    
    let planType = 'free';
    if (priceId) {
      if (priceId === growPriceId) {
        planType = 'grow';
      } else if (priceId === bloomPriceId) {
        planType = 'bloom';
      }
    }
    
    // サブスクリプションの状態を確認
    const invalidStatuses = ['canceled', 'unpaid', 'past_due', 'incomplete_expired'];
    const isInvalidStatus = invalidStatuses.includes(subscription.status);
    const now = Math.floor(Date.now() / 1000);
    const periodEnded = subscription.cancel_at_period_end && 
                       subscription.current_period_end && 
                       subscription.current_period_end < now;
    
    // 無効な状態または期間終了済みの場合はFreeプランに戻す
    if (isInvalidStatus || periodEnded) {
      planType = 'free';
      console.log('⚠️  サブスクリプションが無効な状態または期間終了済みです');
      console.log(`   Freeプランに切り替えます\n`);
    }
    
    // ユーザー情報を更新
    const userIndex = users.findIndex(u => u.id === user.id);
    if (userIndex === -1) {
      console.error('❌ エラー: ユーザーが見つかりませんでした');
      process.exit(1);
    }
    
    const isActive = subscription.status === 'active' && !periodEnded;
    
    users[userIndex].subscription = {
      ...users[userIndex].subscription,
      stripeCustomerId: subscription.customer,
      stripeSubscriptionId: subscription.id,
      planType: planType,
      status: subscription.status,
      currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    };
    
    // ファイルに保存
    fs.writeFileSync(usersPath, JSON.stringify(users, null, 2), 'utf8');
    
    console.log('✅ ユーザー情報を更新しました:');
    console.log(`  - プラン: ${planType}`);
    console.log(`  - ステータス: ${subscription.status}`);
    console.log(`  - アクティブ: ${isActive}\n`);
    
    // 投稿の優先表示フラグを更新
    const postsPath = path.join(__dirname, '..', 'data', 'posts.json');
    let posts = [];
    
    try {
      const postsData = fs.readFileSync(postsPath, 'utf8');
      posts = JSON.parse(postsData);
    } catch (error) {
      console.log('⚠️  posts.json を読み込めませんでした（スキップ）');
    }
    
    const shouldHavePriority = (planType === 'grow' || planType === 'bloom') && isActive;
    let updated = false;
    
    for (let i = 0; i < posts.length; i++) {
      if (posts[i].userId === user.id) {
        posts[i].priorityDisplay = shouldHavePriority;
        posts[i].featuredDisplay = shouldHavePriority;
        posts[i].updatedAt = new Date().toISOString();
        updated = true;
      }
    }
    
    if (updated) {
      fs.writeFileSync(postsPath, JSON.stringify(posts, null, 2), 'utf8');
      console.log('✅ 投稿の優先表示フラグを更新しました');
      console.log(`  - priorityDisplay: ${shouldHavePriority}`);
      console.log(`  - featuredDisplay: ${shouldHavePriority}\n`);
    }
    
    console.log('🎉 同期完了！');
    console.log('\n次に以下を確認してください:');
    console.log('1. ブラウザでページをリロード');
    console.log('2. プランページで「プラン情報を更新」ボタンをクリック');
    console.log('3. プランが正しく表示されることを確認');
    
  } catch (error) {
    console.error('\n❌ エラーが発生しました:');
    console.error(error.message);
    
    if (error.type === 'StripeInvalidRequestError' && error.code === 'resource_missing') {
      console.error('\nサブスクリプションが見つかりませんでした。');
      console.error('サブスクリプションIDが正しいか、または既に削除されている可能性があります。');
      console.error('\n手動でデータベースを更新する場合:');
      console.error('1. data/users.json を開く');
      console.error('2. 該当ユーザーの subscription.planType を "free" に変更');
      console.error('3. subscription.status を "canceled" に変更');
    }
    
    process.exit(1);
  }
}

syncSubscription();

