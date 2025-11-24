# 即時キャンセル時の動作確認

Stripeダッシュボードで「Cancel immediately」（即時キャンセル）を行った場合の動作を確認します。

## 📋 即時キャンセル時の動作

### Stripeの動作

即時キャンセル（Cancel immediately）を行った場合、Stripeは以下のイベントを送信します：

1. **`customer.subscription.updated`** イベント
   - `status: "canceled"`
   - サブスクリプションは即座にキャンセル状態になる

2. **`customer.subscription.deleted`** イベント（通常は即座に送信）
   - サブスクリプションが削除される

### 現在の実装での処理

#### 1. `customer.subscription.updated` イベント

```typescript
// app/api/stripe/webhook/route.ts (212-263行目)
const invalidStatuses = ['canceled', 'unpaid', 'past_due', 'incomplete_expired'];
const isInvalidStatus = invalidStatuses.includes(subscription.status);

if (isInvalidStatus || periodEnded) {
  // Freeプランに戻す
  planType = 'free';
  // ユーザー情報を更新
  // 投稿の優先表示フラグを無効化
}
```

✅ **動作**: `status: "canceled"` の場合、自動的にFreeプランに切り替わります

#### 2. `customer.subscription.deleted` イベント

```typescript
// app/api/stripe/webhook/route.ts (186-210行目)
if (event.type === 'customer.subscription.deleted') {
  // Freeプランに戻す
  planType = 'free';
  status: 'canceled';
  // ユーザー情報を更新
  // 投稿の優先表示フラグを無効化
}
```

✅ **動作**: サブスクリプション削除時、自動的にFreeプランに切り替わります

#### 3. 同期API (`/api/stripe/sync-subscription`)

```typescript
// app/api/stripe/sync-subscription/route.ts (94-109行目)
const invalidStatuses = ['canceled', 'unpaid', 'past_due', 'incomplete_expired'];
const isInvalidStatus = invalidStatuses.includes(subscription.status);

if (isInvalidStatus || periodEnded) {
  planType = 'free';
  // ユーザー情報を更新
  // 投稿の優先表示フラグを無効化
}
```

✅ **動作**: Webhookが届かない場合でも、「プラン情報を更新」ボタンで同期できます

## ✅ 結論

**即時キャンセルを行った場合、プランは自動的にFreeに切り替わります。**

### 動作フロー

1. **Stripeダッシュボードで即時キャンセル**
   ↓
2. **`customer.subscription.updated` イベントが送信**（`status: "canceled"`）
   ↓
3. **Webhook処理でFreeプランに切り替え** ✅
   ↓
4. **`customer.subscription.deleted` イベントが送信**（通常は即座）
   ↓
5. **Webhook処理でFreeプランに切り替え**（既にFreeなので変更なし） ✅

### Webhookが届かない場合

Webhookが届かない場合でも：

1. **「プラン情報を更新」ボタンをクリック**
   ↓
2. **同期APIがStripeから直接情報を取得**
   ↓
3. **`status: "canceled"` を検知してFreeプランに切り替え** ✅

## 🧪 テスト方法

### 方法1: Stripeダッシュボードから即時キャンセル

1. Stripeダッシュボードでサブスクリプションを開く
2. 「Actions」→「Cancel subscription」
3. **「Cancel immediately」** を選択
4. 確認してキャンセル

**確認ポイント**:
- サーバーログで「Webhook: サブスクリプションが無効な状態または期間終了 - Free Planに戻す」が表示される
- または「Webhook: サブスクリプション削除 - Free Planに戻す」が表示される
- `data/users.json` で `planType` が `"free"` になっている
- アプリケーションでプランが Free Plan に切り替わっている

### 方法2: Webhookが届かない場合のテスト

1. Stripeダッシュボードで即時キャンセル
2. Webhookが届かないことを確認（サーバーログにWebhookのログがない）
3. プランページで「プラン情報を更新」ボタンをクリック
4. プランがFreeに切り替わることを確認

## 🔍 デバッグ方法

### サーバーログの確認

以下のログメッセージを確認：

```
Webhook: イベント受信: customer.subscription.updated
Webhook: サブスクリプションが無効な状態または期間終了 - Free Planに戻す
Webhook: Free Planへの切り替え完了
```

または：

```
Webhook: イベント受信: customer.subscription.deleted
Webhook: サブスクリプション削除 - Free Planに戻す
```

### データベースの確認

`data/users.json` で以下を確認：

```json
{
  "subscription": {
    "planType": "free",
    "status": "canceled"
  }
}
```

## ⚠️ 注意事項

1. **Webhookが届く必要がある**: ローカル開発環境の場合、Stripe CLIでWebhookを転送している必要があります
2. **Webhookが届かない場合**: 「プラン情報を更新」ボタンで同期できます
3. **本番環境**: Webhookエンドポイントが正しく設定されている必要があります

## 📚 関連ファイル

- `app/api/stripe/webhook/route.ts` - Webhook処理
- `app/api/stripe/sync-subscription/route.ts` - 同期API
- `app/pricing/page.tsx` - プランページ（「プラン情報を更新」ボタン）

