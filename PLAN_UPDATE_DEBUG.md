# Grow Plan更新問題のデバッグガイド

## 問題
Grow Planに切り替えても、プラン画面ではFree Planのまま表示される

## 確認手順

### 1. サーバーログの確認
決済完了後、サーバーのコンソールで以下のログを確認：

```
Webhook: イベント受信: checkout.session.completed
Webhook: checkout.session.completed { sessionId: ..., userId: ..., planType: ... }
Webhook: ユーザー情報を更新開始
Webhook: ユーザー情報取得成功
Webhook: サブスクリプション情報取得
Webhook: ユーザー情報更新完了
```

### 2. データベース（JSONファイル）の確認
`data/users.json`を開いて、該当ユーザーの`subscription`フィールドを確認：

```json
{
  "id": "ユーザーID",
  "subscription": {
    "planType": "grow",  // ← これが "grow" になっているか確認
    "status": "active",   // ← これが "active" になっているか確認
    "stripeCustomerId": "...",
    "stripeSubscriptionId": "..."
  }
}
```

### 3. APIのレスポンス確認
ブラウザの開発者ツール（F12）で以下を実行：

```javascript
fetch('/api/auth/me', { credentials: 'include' })
  .then(res => res.json())
  .then(data => console.log('User subscription:', data.user?.subscription));
```

### 4. Webhookの設定確認
Stripeダッシュボードで以下を確認：
- Webhookエンドポイントが正しく設定されているか
- `checkout.session.completed`イベントが有効になっているか
- 最近のWebhookイベントでエラーがないか

## 考えられる原因と対処法

### 原因1: Webhookが届いていない
**症状**: サーバーログにWebhookのログが表示されない

**対処法**:
1. StripeダッシュボードでWebhookイベントを確認
2. Webhook URLが正しいか確認（`https://your-domain.com/api/stripe/webhook`）
3. ローカル開発環境の場合は、Stripe CLIを使用してWebhookを転送

### 原因2: Webhookの署名検証が失敗している
**症状**: サーバーログに「署名検証失敗」のエラーが表示される

**対処法**:
1. `STRIPE_WEBHOOK_SECRET`環境変数が正しく設定されているか確認
2. StripeダッシュボードでWebhookシークレットを再生成

### 原因3: ユーザー情報の更新が失敗している
**症状**: Webhookは届いているが、ユーザー情報が更新されていない

**対処法**:
1. `data/users.json`のファイル権限を確認
2. サーバーログでエラーメッセージを確認
3. 手動でユーザー情報を更新して動作確認

### 原因4: フロントエンドのキャッシュ問題
**症状**: データベースは更新されているが、画面に反映されない

**対処法**:
1. ブラウザのキャッシュをクリア
2. 「プラン情報を更新」ボタンをクリック
3. ページを完全にリロード（Ctrl+Shift+R または Cmd+Shift+R）

### 原因5: サーバーの再起動が必要
**症状**: コードを変更したが、変更が反映されていない

**対処法**:
1. 開発サーバーを停止（Ctrl+C）
2. サーバーを再起動
3. 再度決済を試す

## サーバー再起動の手順

### 開発環境
```bash
# サーバーを停止（Ctrl+C）
# サーバーを再起動
npm run dev
```

### 本番環境
```bash
# PM2を使用している場合
pm2 restart your-app-name

# systemdを使用している場合
sudo systemctl restart your-app-name
```

## デバッグ用の追加ログ

現在のコードには詳細なログが追加されています。サーバーのコンソールで以下を確認：

1. Webhookイベントの受信
2. ユーザー情報の取得
3. サブスクリプション情報の取得
4. ユーザー情報の更新
5. 投稿の優先表示フラグの更新

## 緊急時の手動更新方法

もしWebhookが正しく動作しない場合、手動でユーザー情報を更新できます：

1. `data/users.json`を開く
2. 該当ユーザーの`subscription`フィールドを以下に変更：
```json
{
  "subscription": {
    "planType": "grow",
    "status": "active",
    "stripeCustomerId": "cus_...",
    "stripeSubscriptionId": "sub_..."
  }
}
```
3. ファイルを保存
4. ページをリロード

## 次のステップ

1. サーバーログを確認して、どの段階で問題が発生しているか特定
2. データベース（`data/users.json`）を確認して、ユーザー情報が更新されているか確認
3. ブラウザの開発者ツールでAPIのレスポンスを確認
4. 必要に応じてサーバーを再起動

