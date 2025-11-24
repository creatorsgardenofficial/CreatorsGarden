# プラン変更フローとStripeからの情報取得

## 📋 プラン変更の処理フロー

### 1. ユーザーが「プランを選択」ボタンをクリック

フロントエンド（`app/pricing/page.tsx`）から `POST /api/stripe/create-checkout` が呼ばれます。

### 2. 既存サブスクリプションの検索と更新（即座に反映）

`app/api/stripe/create-checkout/route.ts` で以下の処理が行われます：

#### 2-1. データベースから既存のサブスクリプションIDを確認
- `user.subscription?.stripeSubscriptionId` が存在する場合、Stripeから取得を試みます

#### 2-2. Stripeから既存のサブスクリプションを検索
- データベースに `stripeSubscriptionId` がない場合、Stripe APIを使用して検索：
  ```typescript
  const subscriptions = await stripeInstance.subscriptions.list({
    customer: customerId,
    status: 'active',
    limit: 1,
  });
  ```

#### 2-3. 既存サブスクリプションの更新
- 既存のサブスクリプションが見つかった場合：
  1. Stripeのサブスクリプションを更新（価格IDを変更）
  2. **即座に**ユーザー情報を更新（Webhookを待たない）
  3. フロントエンドに `planUpdated: true` を返す
  4. フロントエンドが即座にユーザー情報を再取得して表示を更新

### 3. 新しいサブスクリプションの作成（Webhook待ち）

既存のサブスクリプションがない場合：
1. Stripeのチェックアウトセッションを作成
2. ユーザーをStripeの決済ページにリダイレクト
3. 決済完了後、`/pricing?success=true` にリダイレクト
4. フロントエンドがポーリングでWebhookの完了を待つ（最大20秒）
5. Webhookが届いたらプランが更新される

## 🔄 Webhookでのプラン更新

`app/api/stripe/webhook/route.ts` で以下のイベントを処理：

### `checkout.session.completed`
- 新しいサブスクリプションが作成されたときに発火
- メタデータから `planType` を取得
- Stripeのサブスクリプションから価格IDを取得して検証
- ユーザー情報を更新

### `customer.subscription.updated`
- サブスクリプションが更新されたときに発火
- **Stripeの価格IDから `planType` を取得**（重要！）
- 環境変数の `STRIPE_PRICE_ID_GROW` と `STRIPE_PRICE_ID_BLOOM` と比較
- ユーザー情報を更新

## 📦 Stripeから受け取る情報

### サブスクリプションオブジェクトから取得：
- `subscription.id` → `stripeSubscriptionId`
- `subscription.status` → `status` ('active', 'canceled', etc.)
- `subscription.current_period_end` → `currentPeriodEnd`
- `subscription.cancel_at_period_end` → `cancelAtPeriodEnd`
- `subscription.items.data[0].price.id` → **価格ID（これから `planType` を決定）**

### 価格IDから `planType` を決定：
```typescript
const priceId = subscription.items.data[0]?.price?.id;
const growPriceId = process.env.STRIPE_PRICE_ID_GROW;
const bloomPriceId = process.env.STRIPE_PRICE_ID_BLOOM;

if (priceId === growPriceId) {
  planType = 'grow';
} else if (priceId === bloomPriceId) {
  planType = 'bloom';
} else {
  planType = 'free'; // フォールバック
}
```

## ⚙️ 必要な環境変数

`.env.local` に以下が必要です：

```env
# Stripe API Keys（必須）
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# Stripe Price IDs（必須 - プラン判定に使用）
STRIPE_PRICE_ID_GROW=price_...
STRIPE_PRICE_ID_BLOOM=price_...

# Stripe Webhook Secret（Webhook検証用 - 推奨）
STRIPE_WEBHOOK_SECRET=whsec_...

# ベースURL（必須）
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

## 🐛 トラブルシューティング

### プランが更新されない場合

1. **サーバーログを確認**
   - `Checkout:` で始まるログがあるか確認
   - `Webhook:` で始まるログがあるか確認
   - エラーメッセージがないか確認

2. **環境変数の確認**
   - `STRIPE_PRICE_ID_GROW` が正しく設定されているか
   - Stripeダッシュボードの価格IDと一致しているか

3. **既存サブスクリプションの確認**
   - Stripeダッシュボードで顧客のサブスクリプションを確認
   - 価格IDが正しいか確認

4. **Webhookの確認**
   - ローカル開発環境ではStripe CLIが実行されているか
   - `STRIPE_WEBHOOK_SECRET` が設定されているか

## 📝 デバッグ用ログ

サーバーログで以下のメッセージを確認：

- `Checkout: データベースから既存サブスクリプションを取得`
- `Checkout: Stripeから既存サブスクリプションを検索して取得`
- `Checkout: 既存サブスクリプションを更新 - ユーザー情報を即座に更新`
- `Checkout: ユーザー情報更新完了`
- `Webhook: イベント受信: checkout.session.completed`
- `Webhook: サブスクリプション更新`

