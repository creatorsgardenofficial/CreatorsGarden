# Stripe CLIなしでテストする方法

Stripe CLIがインストールされていない場合でも、Stripeダッシュボードから直接テストできます。

## 📋 現在の状況

- **サブスクリプションID**: `sub_1SW750DJywW1BMn4NfPYOKpq`
- **ユーザー**: テストユーザー4 (ID: 1764000000004)
- **現在のプラン**: grow
- **ステータス**: active

## 🎯 テスト手順（Stripeダッシュボードを使用）

### ステップ1: Stripeダッシュボードにアクセス

1. [Stripeダッシュボード](https://dashboard.stripe.com/test/subscriptions) にログイン
2. **テストモード**になっていることを確認（右上の「Test mode」がON）

### ステップ2: サブスクリプションを検索

1. 左メニューから **「Customers」** をクリック
2. 検索バーにサブスクリプションIDを入力: `sub_1SW750DJywW1BMn4NfPYOKpq`
3. または、顧客を検索: 「テストユーザー4」のメールアドレスで検索

### ステップ3: サブスクリプションをキャンセル

1. 該当するサブスクリプションをクリック
2. 右上の **「Actions」** ボタンをクリック
3. **「Cancel subscription」** を選択
4. **「Cancel at period end」** を選択（期間終了時にキャンセル）
5. **「Cancel subscription」** をクリック

これで `cancel_at_period_end` が `true` に設定されます。

### ステップ4: 期間終了をシミュレート（重要）

期間終了を待たずにテストするには、サブスクリプションの期間を短縮します：

1. サブスクリプション詳細ページで **「Actions」** → **「Update subscription」** をクリック
2. **「Billing cycle anchor」** を変更
   - 現在の日時より過去の日付に設定（例: 1日前）
   - または、**「Billing cycle」** を「Daily」に変更して、次の請求サイクルを短縮

**注意**: Stripeダッシュボードでは期間を直接過去に設定できない場合があります。その場合は、以下の方法を試してください。

### ステップ5: Webhookエンドポイントの確認

StripeダッシュボードでWebhookが設定されている場合、自動的にイベントが送信されます。

1. 左メニューから **「Developers」** → **「Webhooks」** をクリック
2. Webhookエンドポイントが設定されているか確認
   - 設定されていない場合: 本番環境のURLが必要です
   - ローカル開発環境の場合: Stripe CLIが必要です

### ステップ6: 手動でWebhookイベントを送信（オプション）

Stripeダッシュボードから直接Webhookイベントを送信することはできませんが、以下の方法があります：

#### 方法A: Stripe APIを直接呼び出す（Node.jsスクリプト）

以下のスクリプトを作成して実行：

```javascript
// test-webhook-manual.js
const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function testCancellation() {
  const subscriptionId = 'sub_1SW750DJywW1BMn4NfPYOKpq';
  
  // 1. サブスクリプションをキャンセル
  console.log('1. サブスクリプションをキャンセル中...');
  await stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true
  });
  console.log('✅ キャンセル設定完了');
  
  // 2. 期間終了を過去に設定（テスト環境のみ）
  const pastTimestamp = Math.floor(Date.now() / 1000) - 86400; // 1日前
  console.log('2. 期間終了を過去に設定中...');
  try {
    await stripe.subscriptions.update(subscriptionId, {
      billing_cycle_anchor: pastTimestamp
    });
    console.log('✅ 期間終了設定完了');
  } catch (error) {
    console.log('⚠️  期間終了の設定に失敗（Stripeの制限により）');
    console.log('   代わりに、サブスクリプションを直接削除してテストしてください');
  }
  
  // 3. サブスクリプションを削除（期間終了をシミュレート）
  console.log('3. サブスクリプションを削除中（期間終了をシミュレート）...');
  await stripe.subscriptions.cancel(subscriptionId);
  console.log('✅ サブスクリプション削除完了');
  
  console.log('\n🎉 テスト完了！');
  console.log('次に以下を確認してください:');
  console.log('1. サーバーログで「Webhook: Free Planへの切り替え完了」が表示されること');
  console.log('2. data/users.json で planType が "free" になっていること');
}

testCancellation().catch(console.error);
```

実行方法：

```powershell
# .env.localから環境変数を読み込む
node -r dotenv/config test-webhook-manual.js dotenv_config_path=.env.local
```

#### 方法B: サブスクリプションを直接削除

期間終了を待たずに、サブスクリプションを直接削除してテスト：

1. Stripeダッシュボードでサブスクリプションを開く
2. **「Actions」** → **「Cancel subscription」**
3. **「Cancel immediately」** を選択（即座にキャンセル）

これで `customer.subscription.deleted` イベントが発火し、Freeプランに切り替わります。

### ステップ7: 結果を確認

1. **サーバーログを確認**
   - 開発サーバーのコンソールで「Webhook:」で始まるメッセージを確認
   - 「Webhook: Free Planへの切り替え完了」が表示されることを確認

2. **データベースを確認**
   - `data/users.json` を開く
   - ユーザーID `1764000000004` の `subscription.planType` が `"free"` になっていることを確認
   - `subscription.status` が `"canceled"` になっていることを確認

3. **アプリケーションで確認**
   - ブラウザで `/pricing` または `/profile` ページをリロード
   - 「現在のプラン: 🟩 Free Plan（無料）」と表示されることを確認

4. **投稿の優先表示フラグを確認**
   - `data/posts.json` を開く
   - 該当ユーザーの投稿の `priorityDisplay` と `featuredDisplay` が `false` になっていることを確認

---

## 🔄 代替方法: Stripe CLIをインストール

Stripe CLIをインストールすれば、より簡単にテストできます。

詳細は `STRIPE_CLI_QUICK_INSTALL.md` を参照してください。

---

## ⚠️ 注意事項

1. **テスト環境を使用**: 必ずStripeテスト環境（`sk_test_` で始まるキー）を使用してください
2. **Webhookエンドポイント**: ローカル開発環境の場合、Stripe CLIまたはngrokなどのトンネルツールが必要です
3. **本番環境**: 本番環境のWebhookエンドポイントが設定されている場合、自動的にイベントが送信されます

