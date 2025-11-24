# Webhook未受信時の自動同期機能

Webhookが届かない場合でも、サブスクリプション情報を自動的に同期できる機能を実装しました。

## 🎯 実装内容

### 1. 同期APIエンドポイント

**`/api/stripe/sync-subscription`** を作成しました。

このエンドポイントは：
- Stripe APIから直接サブスクリプション情報を取得
- データベースのプラン情報を更新
- 投稿の優先表示フラグを更新
- サブスクリプションが削除されている場合、自動的にFreeプランに戻す

### 2. 「プラン情報を更新」ボタンの機能強化

プランページ（`/pricing`）の「プラン情報を更新」ボタンをクリックすると：

1. **自動的にStripe APIから同期**を試みる
2. 同期が成功した場合、プラン情報が更新される
3. 同期に失敗した場合でも、通常の更新処理を続行

## 📋 使用方法

### ユーザー側

1. プランページ（`/pricing`）にアクセス
2. 「プラン情報を更新」ボタンをクリック
3. 自動的にStripeから最新の情報を取得して更新される

### 開発者側

APIエンドポイントを直接呼び出すこともできます：

```typescript
// POST /api/stripe/sync-subscription
// 認証: Cookie (userId)

const response = await fetch('/api/stripe/sync-subscription', {
  method: 'POST',
  credentials: 'include',
});

const data = await response.json();
// {
//   success: true,
//   message: 'サブスクリプション情報を同期しました',
//   planType: 'free' | 'grow' | 'bloom',
//   status: 'active' | 'canceled' | ...,
//   isActive: boolean,
//   updated: boolean
// }
```

## 🔄 動作フロー

1. **ユーザーが「プラン情報を更新」をクリック**
   ↓
2. **Stripe APIからサブスクリプション情報を取得**
   ↓
3. **サブスクリプションの状態を確認**
   - `status` が `canceled`, `unpaid`, `past_due`, `incomplete_expired` の場合
   - または `cancel_at_period_end` が `true` で期間が終了している場合
   ↓
4. **Freeプランに切り替え**
   ↓
5. **投稿の優先表示フラグを無効化**
   ↓
6. **データベースを更新**
   ↓
7. **ユーザー情報を再取得して画面を更新**

## ⚠️ 注意事項

1. **Stripe APIキーが必要**: `.env.local` に `STRIPE_SECRET_KEY` が設定されている必要があります
2. **レート制限**: Stripe APIにはレート制限があるため、過度な呼び出しは避けてください
3. **Webhookが優先**: この機能はWebhookが届かない場合のフォールバックです。通常はWebhookで自動更新されます

## 🐛 トラブルシューティング

### エラー: "STRIPE_SECRET_KEY is not set"

→ `.env.local` に `STRIPE_SECRET_KEY` を設定してください

### エラー: "Stripe APIエラー: resource_missing"

→ サブスクリプションが削除されている場合、自動的にFreeプランに戻されます

### 同期が失敗する場合

→ サーバーログを確認してください。エラーメッセージが表示されます

## 🔮 今後の改善案

1. **定期的な自動同期**: バックグラウンドジョブで定期的に同期（例: 1時間ごと）
2. **プロフィールページにも追加**: プロフィールページからも同期できるようにする
3. **通知機能**: 同期が成功/失敗した場合に通知を表示

## 📚 関連ファイル

- `app/api/stripe/sync-subscription/route.ts` - 同期APIエンドポイント
- `app/pricing/page.tsx` - プランページ（「プラン情報を更新」ボタン）
- `scripts/sync-subscription-status.js` - 手動同期スクリプト（CLI用）

