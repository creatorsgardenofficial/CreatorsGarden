# デプロイ手順

Creators Gardenのデプロイ手順を説明します。

## デプロイ前の準備

### 1. 環境変数の確認

`.env.local` ファイルに以下の環境変数が設定されていることを確認してください：

- **Stripe設定**（必須）
  - `STRIPE_SECRET_KEY`
  - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
  - `STRIPE_WEBHOOK_SECRET`
  - `STRIPE_PRICE_ID_GROW`
  - `STRIPE_PRICE_ID_BLOOM`

- **ベースURL**（必須）
  - `NEXT_PUBLIC_BASE_URL` - 本番環境のURL（例: `https://yourdomain.com`）

- **メール送信設定**（オプション）
  - `SMTP_HOST`
  - `SMTP_PORT`
  - `SMTP_SECURE`
  - `SMTP_USER`
  - `SMTP_PASS`
  - `SMTP_FROM_EMAIL`
  - `SMTP_FROM_NAME`

- **A8.net広告コード**（オプション）
  - `NEXT_PUBLIC_A8_AD_CODE`

### 2. データストレージの確認

現在、このアプリケーションはJSONファイルベースのストレージを使用しています。
本番環境では、以下のいずれかの対応が必要です：

- **Vercel**: 一時的なストレージとして使用可能（再起動時にデータが失われる可能性あり）
- **データベース移行**: PostgreSQL、MySQL、MongoDBなどへの移行を推奨

## デプロイ方法

### 方法1: Vercel（推奨・最も簡単）

VercelはNext.jsの開発元が提供するホスティングサービスで、最も簡単にデプロイできます。

#### 手順

1. **Vercelアカウントの作成**
   - [https://vercel.com](https://vercel.com) にアクセス
   - GitHubアカウントでサインアップ（推奨）

2. **プロジェクトのインポート**
   - Vercelダッシュボードで「New Project」をクリック
   - GitHubリポジトリを選択（または手動でアップロード）
   - プロジェクトをインポート

3. **環境変数の設定**
   - プロジェクト設定の「Environment Variables」で、`.env.local`の内容を設定
   - すべての環境変数を追加

4. **ビルド設定**
   - Framework Preset: `Next.js`
   - Build Command: `npm run build`（自動検出される）
   - Output Directory: `.next`（自動検出される）
   - Install Command: `npm install`

5. **デプロイ**
   - 「Deploy」ボタンをクリック
   - ビルドが完了すると、自動的にデプロイされます

6. **カスタムドメインの設定**（オプション）
   - プロジェクト設定の「Domains」でカスタムドメインを追加
   - DNS設定を完了

#### 注意事項

- **データの永続化**: Vercelの無料プランでは、ファイルシステムへの書き込みは一時的です
- **Stripe Webhook**: 本番環境のWebhook URLをStripeダッシュボードで設定してください
- **環境変数**: 本番環境用の環境変数を必ず設定してください

### 方法2: その他のホスティングサービス

#### Netlify

1. [https://netlify.com](https://netlify.com) でアカウント作成
2. GitHubリポジトリを接続
3. ビルド設定：
   - Build command: `npm run build`
   - Publish directory: `.next`
4. 環境変数を設定
5. デプロイ

#### AWS / Azure / GCP

各クラウドプロバイダーの手順に従ってデプロイしてください。
Dockerコンテナ化やサーバーレス関数の使用を検討してください。

### 方法3: 自前サーバー

#### 必要なもの

- Node.js 18以上がインストールされたサーバー
- ドメインとSSL証明書（Let's Encrypt推奨）

#### 手順

1. **サーバーへのデプロイ**
   ```bash
   # サーバーにSSH接続
   ssh user@your-server.com
   
   # プロジェクトをクローン
   git clone https://github.com/your-username/creator-collab.git
   cd creator-collab
   
   # 依存関係のインストール
   npm install
   
   # 環境変数の設定
   cp env.local.template .env.local
   # .env.localを編集
   
   # ビルド
   npm run build
   ```

2. **PM2を使用したプロセス管理**
   ```bash
   # PM2のインストール
   npm install -g pm2
   
   # アプリケーションの起動
   pm2 start npm --name "creator-collab" -- start
   
   # 自動起動の設定
   pm2 startup
   pm2 save
   ```

3. **Nginxリバースプロキシの設定**
   ```nginx
   server {
       listen 80;
       server_name yourdomain.com;
       
       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

4. **SSL証明書の設定**（Let's Encrypt）
   ```bash
   sudo apt-get install certbot python3-certbot-nginx
   sudo certbot --nginx -d yourdomain.com
   ```

## デプロイ後の確認事項

### 1. 動作確認

- [ ] ホームページが表示される
- [ ] ユーザー登録ができる
- [ ] ログインができる
- [ ] 投稿の作成・閲覧ができる
- [ ] Stripe決済が動作する（テストモードで確認）

### 2. Stripe Webhookの設定

1. Stripeダッシュボードにログイン
2. 「開発者」→「Webhook」に移動
3. 「エンドポイントを追加」をクリック
4. エンドポイントURL: `https://yourdomain.com/api/webhooks/stripe`
5. イベントを選択（すべて選択推奨）
6. Webhookシークレットをコピーして環境変数に設定

### 3. メール送信の確認

- SMTP設定が正しく動作するか確認
- パスワードリセットメールが送信されるか確認

### 4. セキュリティ確認

- [ ] HTTPSが有効になっている
- [ ] 環境変数が正しく設定されている
- [ ] セキュリティヘッダーが設定されている（next.config.tsで設定済み）

## トラブルシューティング

### ビルドエラー

```bash
# ローカルでビルドをテスト
npm run build
```

### 環境変数の問題

- 環境変数が正しく設定されているか確認
- 本番環境と開発環境で異なる値が必要な場合がある

### データが保存されない

- Vercelなどのサーバーレス環境では、ファイルシステムへの書き込みが一時的です
- データベースへの移行を検討してください

### Stripe Webhookが動作しない

- Webhook URLが正しいか確認
- Webhookシークレットが正しく設定されているか確認
- Stripe CLIでローカルテスト: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`

## 本番環境での推奨事項

1. **データベースの導入**
   - PostgreSQL、MySQL、MongoDBなどへの移行
   - Prisma、TypeORMなどのORMを使用

2. **ログの監視**
   - Sentryなどのエラートラッキングサービス
   - ログ集約サービス（Datadog、LogRocketなど）

3. **バックアップ**
   - データの定期的なバックアップ
   - データベースのスナップショット

4. **パフォーマンス最適化**
   - CDNの使用
   - 画像の最適化
   - キャッシュ戦略の見直し

5. **セキュリティ強化**
   - 定期的な依存関係の更新
   - セキュリティスキャンの実施
   - レート制限の実装

## サポート

デプロイに関する問題が発生した場合は、以下を確認してください：

1. ログを確認
2. 環境変数が正しく設定されているか確認
3. ビルドが成功するかローカルで確認
4. ドキュメントを再確認

