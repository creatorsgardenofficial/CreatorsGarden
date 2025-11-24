# Stripe決済機能 クイックスタートガイド

## 📦 npm install完了後の次のステップ

### 1. 環境変数ファイルの作成

プロジェクトルート（`creator-collab`フォルダ）に`.env.local`ファイルを作成してください。

```bash
# Windows (PowerShell)
New-Item -Path .env.local -ItemType File

# Mac/Linux
touch .env.local
```

### 2. Stripeアカウントのセットアップ

1. [Stripe](https://stripe.com)にアクセスしてアカウントを作成（無料）
2. ダッシュボードにログイン: https://dashboard.stripe.com
3. 「開発者」→「APIキー」から以下を取得：
   - **シークレットキー**（`sk_test_...`で始まる）
   - **公開可能キー**（`pk_test_...`で始まる）

### 3. 価格（プラン）の作成

1. Stripeダッシュボードで「製品」→「価格を追加」をクリック
2. 以下の設定で価格を作成：
   - **価格タイプ**: 定期（サブスクリプション）
   - **価格**: ¥200
   - **通貨**: JPY（日本円）
   - **請求期間**: 月次
   - **価格ID**をコピー（`price_...`で始まる）

### 4. 環境変数の設定

`.env.local`ファイルに以下を記入：

```env
# Stripe API Keys
STRIPE_SECRET_KEY=sk_test_あなたのシークレットキー
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_あなたの公開キー

# Stripe Price IDs
STRIPE_PRICE_ID_GROW=price_あなたの価格ID

# ベースURL（開発環境）
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

**注意**: 
- `STRIPE_WEBHOOK_SECRET`は後で設定します（Webhook設定時）
- `STRIPE_PRICE_ID_BLOOM`はBloom Plan実装時に設定

### 5. 開発サーバーの起動

```bash
npm run dev
```

### 6. 動作確認

1. ブラウザで `http://localhost:3000` にアクセス
2. ログイン後、ヘッダーの「プラン」リンクをクリック
3. Grow Planの「プランを選択」ボタンをクリック
4. Stripeのテスト決済画面が表示されることを確認

### 7. テストカード

Stripeテスト環境では以下のカード番号が使用できます：

- **成功**: `4242 4242 4242 4242`
- **3Dセキュア認証**: `4000 0025 0000 3155`
- **失敗**: `4000 0000 0000 0002`

有効期限: 任意の未来の日付（例: 12/25）  
CVC: 任意の3桁（例: 123）  
郵便番号: 任意（例: 12345）

### 8. Webhookの設定（本番環境またはStripe CLI使用時）

#### オプションA: Stripe CLIを使用（開発環境推奨）

```bash
# Stripe CLIをインストール
# https://stripe.com/docs/stripe-cli

# Webhookをローカルに転送
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

#### オプションB: Stripeダッシュボードで設定

1. Stripeダッシュボードで「開発者」→「Webhook」を開く
2. 「エンドポイントを追加」をクリック
3. エンドポイントURL: `https://yourdomain.com/api/stripe/webhook`
4. イベントを選択：
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Webhookシークレットをコピーして`.env.local`に追加：
   ```env
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```

## ⚠️ トラブルシューティング

### エラー: "プランの価格IDが設定されていません"

→ `.env.local`の`STRIPE_PRICE_ID_GROW`が正しく設定されているか確認

### エラー: "Stripe公開キーが設定されていません"

→ `.env.local`の`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`が正しく設定されているか確認

### エラー: "STRIPE_SECRET_KEYが設定されていません"

→ `.env.local`の`STRIPE_SECRET_KEY`が正しく設定されているか確認
→ サーバーを再起動してください（環境変数の変更は再起動が必要）

### 決済画面が表示されない

→ ブラウザのコンソールでエラーを確認
→ サーバーログでエラーを確認
→ Stripe APIキーが正しいか確認

## 📚 詳細情報

詳細なセットアップ手順は`STRIPE_SETUP.md`を参照してください。

## ✅ チェックリスト

- [ ] Stripeアカウントを作成
- [ ] APIキーを取得
- [ ] 価格（プラン）を作成
- [ ] `.env.local`ファイルを作成
- [ ] 環境変数を設定
- [ ] 開発サーバーを起動
- [ ] プランページにアクセス
- [ ] テスト決済を実行

---

準備完了です！🎉

