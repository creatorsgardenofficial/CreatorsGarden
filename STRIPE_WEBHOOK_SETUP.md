# Stripe Webhook セットアップガイド

## ローカル開発環境でのWebhook設定

ローカル開発環境でStripeのWebhookを受信するには、Stripe CLIを使用してWebhookを転送する必要があります。

### 1. Stripe CLIのインストール

Stripe CLIがインストールされていない場合：

**Windows (PowerShell):**
```powershell
# 方法1: wingetを使用（推奨）
winget install stripe.stripe-cli

# インストール後、PowerShellを再起動
```

**詳細なインストール手順**: `STRIPE_CLI_INSTALL_WINDOWS.md` を参照してください。

**macOS/Linux:**
```bash
# Homebrew (macOS)
brew install stripe/stripe-cli/stripe

# または公式インストーラーを使用
```

### 2. Stripe CLIでログイン

```bash
stripe login
```

### 3. Webhookを転送

開発サーバーが起動している状態で、別のターミナルで以下を実行：

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

または、ポート3001を使用している場合：

```bash
stripe listen --forward-to localhost:3001/api/stripe/webhook
```

### 4. Webhookシークレットの設定

Stripe CLIを実行すると、`whsec_...` で始まるWebhookシークレットが表示されます。
このシークレットを `.env.local` ファイルの `STRIPE_WEBHOOK_SECRET` に設定してください。

例：
```
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 5. 動作確認

Webhookが正しく転送されているか確認するには：
1. Stripe CLIのターミナルでイベントが表示されることを確認
2. サーバーのログで「Webhook: イベント受信:」というメッセージが表示されることを確認

## 本番環境でのWebhook設定

本番環境では、StripeダッシュボードでWebhookエンドポイントを設定します：

1. Stripeダッシュボード → Developers → Webhooks
2. 「Add endpoint」をクリック
3. エンドポイントURL: `https://your-domain.com/api/stripe/webhook`
4. イベントを選択：
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
5. Webhookシークレットをコピーして、環境変数に設定

## トラブルシューティング

### Webhookが届かない場合

1. Stripe CLIが実行されているか確認
2. ポート番号が正しいか確認（3000または3001）
3. `STRIPE_WEBHOOK_SECRET` が正しく設定されているか確認
4. サーバーのログでエラーメッセージを確認

### プランが更新されない場合

1. サーバーログで「Checkout:」または「Webhook:」のメッセージを確認
2. `data/users.json` でユーザーの `planType` が更新されているか確認
3. ブラウザのコンソールでエラーメッセージを確認

