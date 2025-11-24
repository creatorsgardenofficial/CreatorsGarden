# 即時キャンセル時の自動反映機能

Stripe側で即時キャンセル（Cancel immediately）を行った場合に、自動的にプランがFreeに切り替わる機能を実装しました。

## 🎯 実装内容

### 1. 自動同期の強化

`/api/auth/me` エンドポイントで、以下の場合に自動的に同期を試みます：

#### 通常の同期条件（既存）
- **期限切れ**: `cancelAtPeriodEnd: true` かつ `currentPeriodEnd` が過去の日付
- **無効なステータス**: `status` が `canceled`, `unpaid`, `past_due`, `incomplete_expired`

#### 即時キャンセル対応（新規追加）
- **定期チェック**: サブスクリプションIDがある場合、`status` が `"active"` でも定期的にStripeから最新の状態を取得
- **削除検知**: サブスクリプションが削除されている場合（`resource_missing`エラー）、自動的にFreeプランに戻す

### 2. エラーハンドリングの改善

即時キャンセルの場合、Stripeからサブスクリプションを取得しようとすると、以下のエラーが発生する可能性があります：

- **`resource_missing`**: サブスクリプションが削除されている

この場合、自動的にFreeプランに切り替えます。

## 📋 動作フロー

### 即時キャンセル時（Webhookが届かない場合）

```
ユーザーがページにアクセス
  ↓
/api/auth/me が呼ばれる
  ↓
サブスクリプションIDがあることを確認
  ↓
Stripe APIから最新の状態を取得
  ↓
サブスクリプションが削除されている場合（resource_missing）
  ↓
自動的にFreeプランに切り替え
  ↓
投稿の優先表示フラグを無効化
  ↓
次のリクエストで最新の情報が返される
```

### 即時キャンセル時（Webhookが届く場合）

```
Stripeダッシュボードで即時キャンセル
  ↓
customer.subscription.updated イベント（status: "canceled"）
  ↓
Webhook処理: Freeプランに切り替え ✅
  ↓
customer.subscription.deleted イベント
  ↓
Webhook処理: Freeプランに切り替え（既にFreeなので変更なし） ✅
```

## ✅ 動作条件

自動同期が実行される条件：

1. **期限切れ**: `cancelAtPeriodEnd: true` かつ `currentPeriodEnd` が過去の日付
2. **無効なステータス**: `status` が `canceled`, `unpaid`, `past_due`, `incomplete_expired`
3. **定期チェック**: サブスクリプションIDがあり、`planType` が `free` でない場合
4. **削除検知**: Stripeからサブスクリプションを取得しようとした際に `resource_missing` エラーが発生

## 🔍 確認方法

### サーバーログの確認

即時キャンセルが検知されると、以下のログが表示されます：

```
AutoSync: 定期チェック - サブスクリプション状態を確認
AutoSync: サブスクリプションが削除されています - Freeプランに戻す
AutoSync: Freeプランへの切り替え完了（サブスクリプション削除）
```

または、Webhookが届いた場合：

```
Webhook: サブスクリプションが無効な状態または期間終了 - Free Planに戻す
Webhook: Free Planへの切り替え完了
```

### データベースの確認

`data/users.json` で以下を確認：

```json
{
  "subscription": {
    "planType": "free",
    "status": "canceled",
    "stripeSubscriptionId": "sub_xxxxxxxxxxxxx"
  }
}
```

## ⚠️ 注意事項

1. **非同期処理**: 同期処理はバックグラウンドで実行されるため、最初のリクエストでは古い情報が返される可能性があります
2. **次のリクエストで反映**: 同期が完了すると、次のリクエストで最新の情報が返されます
3. **レート制限**: Stripe APIにはレート制限があるため、過度な同期は避けられます（条件チェックで制限）
4. **エラーハンドリング**: 同期処理でエラーが発生しても、通常のユーザー情報取得は続行されます

## 🎯 メリット

1. **自動反映**: Webhookが届かない場合でも、ページにアクセスするだけで自動的に反映されます
2. **即時キャンセル対応**: 即時キャンセルを行った場合でも、自動的にFreeプランに切り替わります
3. **削除検知**: サブスクリプションが削除されている場合も、自動的に検知してFreeプランに戻します
4. **バックグラウンド処理**: レスポンス時間に影響しません

## 📚 関連ファイル

- `app/api/auth/me/route.ts` - 自動同期の実装
- `app/api/stripe/sync-subscription/route.ts` - 同期処理の実装
- `app/api/stripe/webhook/route.ts` - Webhook処理（即時キャンセル時のイベント処理）

