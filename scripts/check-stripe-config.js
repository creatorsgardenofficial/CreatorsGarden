/**
 * Stripe設定確認スクリプト
 * 
 * このスクリプトは、Stripeの環境変数が正しく設定されているか確認します。
 * 実行方法: node scripts/check-stripe-config.js
 */

require('dotenv').config({ path: '.env.local' });

const requiredEnvVars = [
  'STRIPE_SECRET_KEY',
  'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
  'STRIPE_PRICE_ID_GROW',
  'NEXT_PUBLIC_BASE_URL',
];

const optionalEnvVars = [
  'STRIPE_WEBHOOK_SECRET',
  'STRIPE_PRICE_ID_BLOOM',
];

console.log('=== Stripe設定確認 ===\n');

let hasErrors = false;

// 必須環境変数の確認
console.log('【必須環境変数】');
requiredEnvVars.forEach(varName => {
  const value = process.env[varName];
  if (!value || value.includes('YOUR_') || value.includes('HERE')) {
    console.log(`❌ ${varName}: 設定されていません（プレースホルダーのまま）`);
    hasErrors = true;
  } else {
    // 値の一部をマスクして表示（セキュリティのため）
    const masked = varName.includes('SECRET') || varName.includes('KEY')
      ? `${value.substring(0, 10)}...${value.substring(value.length - 4)}`
      : value;
    console.log(`✅ ${varName}: ${masked}`);
    
    // 形式チェック
    if (varName === 'STRIPE_SECRET_KEY' && !value.startsWith('sk_test_') && !value.startsWith('sk_live_')) {
      console.log(`   ⚠️  警告: シークレットキーは 'sk_test_' または 'sk_live_' で始まる必要があります`);
    }
    if (varName === 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY' && !value.startsWith('pk_test_') && !value.startsWith('pk_live_')) {
      console.log(`   ⚠️  警告: 公開キーは 'pk_test_' または 'pk_live_' で始まる必要があります`);
    }
    if (varName === 'STRIPE_PRICE_ID_GROW' && !value.startsWith('price_')) {
      console.log(`   ⚠️  警告: 価格IDは 'price_' で始まる必要があります`);
    }
  }
});

console.log('\n【オプション環境変数】');
optionalEnvVars.forEach(varName => {
  const value = process.env[varName];
  if (!value || value.includes('YOUR_') || value.includes('HERE')) {
    console.log(`⚠️  ${varName}: 設定されていません（オプション）`);
  } else {
    const masked = varName.includes('SECRET') || varName.includes('KEY')
      ? `${value.substring(0, 10)}...${value.substring(value.length - 4)}`
      : value;
    console.log(`✅ ${varName}: ${masked}`);
  }
});

console.log('\n=== 確認結果 ===');
if (hasErrors) {
  console.log('❌ 設定に問題があります。上記のエラーを修正してください。');
  process.exit(1);
} else {
  console.log('✅ すべての必須環境変数が設定されています！');
  console.log('\n次のステップ:');
  console.log('1. サーバーを起動: npm run dev');
  console.log('2. ブラウザで http://localhost:3000/pricing にアクセス');
  console.log('3. Grow Planの「プランを選択」ボタンをクリックして動作確認');
}

