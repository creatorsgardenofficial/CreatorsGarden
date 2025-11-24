# サブスクリプションキャンセル・期間終了テストガイド

このドキュメントでは、Grow Planが契約解除されたときに、期間終了後にFreeプランに自動切り替わる機能をテストする方法を説明します。

## 📋 テスト方法の概要

以下の3つの方法でテストできます：

1. **Stripe CLIを使用した手動テスト**（推奨・最も簡単）
2. **実際のサブスクリプションでテスト**（時間がかかる）
3. **Stripeダッシュボードで直接操作**

---

## 方法1: Stripe CLIを使用した手動テスト（推奨）

この方法は、実際に期間を待たずに、Webhookイベントを手動で送信してテストできます。

### 前提条件

1. Stripe CLIがインストールされていること
2. 開発サーバーが起動していること
3. Stripe CLIでWebhookを転送していること

```bash
# ターミナル1: 開発サーバーを起動
npm run dev

# ターミナル2: Stripe CLIでWebhookを転送
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

### ステップ1: テスト用のサブスクリプションを作成

1. アプリケーションにログイン
2. `/pricing` ページにアクセス
3. Grow Planの「プランを選択」をクリック
4. テストカード `4242 4242 4242 4242` で決済を完了
5. サブスクリプションが作成されたことを確認

### ステップ2: サブスクリプションIDを取得

Stripe CLIのログまたはサーバーログから、サブスクリプションIDを確認します。

または、`data/users.json` を開いて、該当ユーザーの `subscription.stripeSubscriptionId` を確認します。

### ステップ3: サブスクリプションをキャンセル（期間終了時にキャンセル）

Stripe CLIで以下のコマンドを実行：

```bash
# サブスクリプションIDを置き換えてください
stripe subscriptions update sub_xxxxxxxxxxxxx --cancel-at-period-end
```

これで、`cancel_at_period_end` が `true` に設定されます。

### ステップ4: 期間終了をシミュレート

期間終了時のWebhookイベントを手動で送信します。

#### 4-1. `customer.subscription.updated` イベント（status: canceled）

```bash
# サブスクリプションIDと顧客IDを置き換えてください
stripe trigger customer.subscription.updated \
  --override subscription:id=sub_xxxxxxxxxxxxx \
  --override subscription:status=canceled \
  --override subscription:cancel_at_period_end=true \
  --override subscription:current_period_end=$(($(date +%s) - 86400))
```

または、より詳細に設定する場合：

```bash
# サブスクリプションを取得して、期間終了を過去の日付に設定
stripe subscriptions update sub_xxxxxxxxxxxxx \
  --cancel-at-period-end \
  --billing-cycle-anchor $(($(date +%s) - 86400))
```

#### 4-2. `customer.subscription.deleted` イベント

```bash
stripe trigger customer.subscription.deleted \
  --override subscription:id=sub_xxxxxxxxxxxxx
```

### ステップ5: 結果を確認

1. **サーバーログを確認**
   - 「Webhook: サブスクリプションが無効な状態または期間終了 - Free Planに戻す」というメッセージが表示されることを確認
   - 「Webhook: Free Planへの切り替え完了」というメッセージが表示されることを確認

2. **データベースを確認**
   - `data/users.json` を開いて、該当ユーザーの `subscription.planType` が `"free"` になっていることを確認
   - `subscription.status` が `"canceled"` になっていることを確認

3. **アプリケーションで確認**
   - ブラウザで `/pricing` または `/profile` ページをリロード
   - 「現在のプラン: 🟩 Free Plan（無料）」と表示されることを確認

4. **投稿の優先表示フラグを確認**
   - 該当ユーザーの投稿の `priorityDisplay` と `featuredDisplay` が `false` になっていることを確認

---

## 方法2: 実際のサブスクリプションでテスト

実際にサブスクリプションを作成して、期間終了を待つ方法です（時間がかかります）。

### ステップ1: サブスクリプションを作成

方法1のステップ1と同じ手順でサブスクリプションを作成します。

### ステップ2: サブスクリプションをキャンセル

1. `/pricing` ページで「サブスクリプションを管理」をクリック
2. Stripeカスタマーポータルで「キャンセル」をクリック
3. `cancel_at_period_end` が `true` に設定されることを確認

### ステップ3: 期間終了を待つ

通常は1ヶ月待つ必要がありますが、Stripeテスト環境では以下の方法で期間を短縮できます：

#### オプションA: Stripeダッシュボードで期間を変更

1. Stripeダッシュボード → Customers → 該当顧客を選択
2. Subscriptions → 該当サブスクリプションを選択
3. 「Actions」→「Update subscription」
4. 「Billing cycle」を変更（例: 日次に変更）

#### オプションB: Stripe CLIで期間を変更

```bash
# サブスクリプションIDを置き換えてください
# 期間終了日を1時間後に設定
stripe subscriptions update sub_xxxxxxxxxxxxx \
  --billing-cycle-anchor $(($(date +%s) + 3600))
```

### ステップ4: 結果を確認

期間終了後、方法1のステップ5と同じ手順で確認します。

---

## 方法3: Stripeダッシュボードで直接操作

Stripeダッシュボードから直接サブスクリプションを操作する方法です。

### ステップ1: サブスクリプションを作成

方法1のステップ1と同じ手順でサブスクリプションを作成します。

### ステップ2: Stripeダッシュボードでキャンセル

1. Stripeダッシュボード → Customers → 該当顧客を選択
2. Subscriptions → 該当サブスクリプションを選択
3. 「Actions」→「Cancel subscription」
4. 「Cancel at period end」を選択してキャンセル

### ステップ3: 期間終了をシミュレート

1. サブスクリプション詳細ページで「Actions」→「Update subscription」
2. 「Billing cycle anchor」を過去の日付に変更
3. または、Stripe CLIで期間を変更（方法2のオプションB参照）

### ステップ4: 結果を確認

方法1のステップ5と同じ手順で確認します。

---

## 🔍 デバッグ方法

### サーバーログの確認

以下のログメッセージを確認してください：

```
Webhook: イベント受信: customer.subscription.updated
Webhook: サブスクリプションが無効な状態または期間終了 - Free Planに戻す
Webhook: Free Planへの切り替え完了
```

### データベースの確認

`data/users.json` で以下のフィールドを確認：

```json
{
  "subscription": {
    "planType": "free",
    "status": "canceled",
    "cancelAtPeriodEnd": true,
    "currentPeriodEnd": "2024-01-01T00:00:00.000Z"
  }
}
```

### 投稿の優先表示フラグの確認

`data/posts.json` で該当ユーザーの投稿を確認：

```json
{
  "userId": "user_id",
  "priorityDisplay": false,
  "featuredDisplay": false
}
```

---

## ⚠️ 注意事項

1. **テスト環境を使用**: 必ずStripeテスト環境（`sk_test_` で始まるキー）を使用してください
2. **Webhookシークレット**: Stripe CLIを使用する場合、`stripe listen` で表示されるシークレットを `.env.local` に設定してください
3. **サーバーの再起動**: コードを変更した場合は、サーバーを再起動してください
4. **データのバックアップ**: テスト前に `data/users.json` と `data/posts.json` をバックアップすることを推奨します

---

## 🐛 トラブルシューティング

### Webhookが届かない

1. Stripe CLIが実行されているか確認
2. `STRIPE_WEBHOOK_SECRET` が正しく設定されているか確認
3. サーバーログでエラーメッセージを確認

### プランが更新されない

1. サーバーログで「Webhook:」のメッセージを確認
2. `data/users.json` のファイル権限を確認
3. ブラウザのキャッシュをクリアしてページをリロード

### 期間終了が検知されない

1. `subscription.cancel_at_period_end` が `true` になっているか確認
2. `subscription.current_period_end` が過去の日付になっているか確認
3. サーバーログで `periodEnded` の値を確認

---

## 📚 参考資料

- [Stripe CLI ドキュメント](https://stripe.com/docs/stripe-cli)
- [Stripe Webhook イベント](https://stripe.com/docs/api/webhooks)
- [サブスクリプション管理](https://stripe.com/docs/billing/subscriptions/overview)

