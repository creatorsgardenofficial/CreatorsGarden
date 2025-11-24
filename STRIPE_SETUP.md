# Stripe決済機能セットアップガイド

## 概要

Creators GardenにStripeを使用した有料プラン機能を実装しました。

---

## 📋 実装済み機能

### 1. プラン管理 ✅
- **Free Plan（無料）**: タグ3個まで、ブックマーク10件まで
- **Grow Plan（¥200/月）**: タグ10個まで、ブックマーク無制限、優先表示、注目のアイデア枠
- **Bloom Plan（準備中）**: 今後追加予定

### 2. Stripe統合 ✅
- チェックアウトセッション作成
- Webhook処理（支払い成功、失敗、サブスクリプション更新）
- カスタマーポータル（サブスクリプション管理）

### 3. プラン制限機能 ✅
- タグ数の制限（投稿作成時）
- ブックマーク数の制限（今後実装予定）
- 優先表示機能（投稿一覧）
- 注目のアイデア枠（投稿一覧）

---

## 🔧 セットアップ手順

### 1. Stripeアカウントの作成

1. [Stripe](https://stripe.com)にアカウントを作成
2. ダッシュボードでAPIキーを取得

### 2. 環境変数の設定

`.env.local`ファイルを作成または編集し、以下を追加：

```env
# Stripe API Keys
STRIPE_SECRET_KEY=sk_test_...（テスト環境のシークレットキー）
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...（テスト環境の公開キー）
STRIPE_WEBHOOK_SECRET=whsec_...（Webhookシークレット）

# Stripe Price IDs（Stripeダッシュボードで作成した価格ID）
STRIPE_PRICE_ID_GROW=price_...（Grow Planの価格ID）
STRIPE_PRICE_ID_BLOOM=price_...（Bloom Planの価格ID、準備中）

# ベースURL
NEXT_PUBLIC_BASE_URL=http://localhost:3000（開発環境）
# 本番環境: NEXT_PUBLIC_BASE_URL=https://yourdomain.com
```

### 3. Stripeでプラン（価格）を作成

1. Stripeダッシュボードにログイン
2. 「製品」→「価格を追加」をクリック
3. Grow Planの価格を作成：
   - **価格タイプ**: 定期（サブスクリプション）
   - **価格**: ¥200
   - **請求期間**: 月次
   - **価格ID**をコピーして`.env.local`の`STRIPE_PRICE_ID_GROW`に設定

### 4. Webhookエンドポイントの設定

1. Stripeダッシュボードで「開発者」→「Webhook」を開く
2. 「エンドポイントを追加」をクリック
3. エンドポイントURLを設定：
   - 開発環境: `http://localhost:3000/api/stripe/webhook`
   - 本番環境: `https://yourdomain.com/api/stripe/webhook`
4. イベントを選択：
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Webhookシークレットをコピーして`.env.local`の`STRIPE_WEBHOOK_SECRET`に設定

### 5. パッケージのインストール

```bash
cd creator-collab
npm install
```

---

## 🎯 実装された機能詳細

### プラン制限

| 機能 | Free Plan | Grow Plan | Bloom Plan |
|------|-----------|-----------|--------------|
| タグ数 | 3個まで | 10個まで | 20個まで（準備中） |
| ブックマーク | 10件まで | 無制限 | 無制限（準備中） |
| 優先表示 | ❌ | ✅ | ✅（準備中） |
| 注目のアイデア枠 | ❌ | ✅ | ✅（準備中） |

### APIエンドポイント

- `GET /api/stripe/config` - Stripe公開キー取得
- `POST /api/stripe/create-checkout` - チェックアウトセッション作成
- `POST /api/stripe/webhook` - Webhook処理
- `POST /api/stripe/create-portal` - カスタマーポータルセッション作成

### ページ

- `/pricing` - プラン選択ページ

---

## 📝 使用方法

### 1. プランの選択

1. ログイン後、ヘッダーの「プラン」リンクをクリック
2. 希望のプランを選択
3. Stripeチェックアウトページで決済情報を入力
4. 決済完了後、自動的にプランが有効化されます

### 2. サブスクリプションの管理

1. プロフィールページまたはプランページから「サブスクリプションを管理」をクリック
2. Stripeカスタマーポータルで以下が可能：
   - プランの変更
   - 支払い方法の変更
   - サブスクリプションのキャンセル
   - 請求履歴の確認

### 3. プラン制限の確認

- 投稿作成時にタグ数の制限が表示されます
- 制限を超えた場合は、エラーメッセージとプランアップグレードへのリンクが表示されます

---

## 🔍 動作確認

### テストカード

Stripeテスト環境では以下のカード番号が使用できます：

- **成功**: `4242 4242 4242 4242`
- **3Dセキュア認証**: `4000 0025 0000 3155`
- **失敗**: `4000 0000 0000 0002`

有効期限: 任意の未来の日付（例: 12/25）
CVC: 任意の3桁（例: 123）

---

## ⚠️ 注意事項

### 開発環境

- テストモードのAPIキーを使用してください
- Webhookのテストには、Stripe CLIを使用することを推奨します

### 本番環境

- 本番環境のAPIキーを使用してください
- HTTPSを有効にしてください
- Webhookエンドポイントを本番URLに設定してください

---

## 🐛 トラブルシューティング

### Webhookが動作しない

1. Webhookシークレットが正しく設定されているか確認
2. StripeダッシュボードでWebhookイベントが送信されているか確認
3. サーバーログでエラーを確認

### 決済が完了しない

1. Stripeダッシュボードでエラーを確認
2. 価格IDが正しく設定されているか確認
3. テストカードを使用しているか確認

---

## 📚 参考資料

- [Stripe公式ドキュメント](https://stripe.com/docs)
- [Stripe Next.js統合ガイド](https://stripe.com/docs/payments/checkout)
- [Stripe Webhookガイド](https://stripe.com/docs/webhooks)

---

## ✅ 実装完了項目

- [x] Stripeパッケージのインストール
- [x] ユーザータイプにプラン情報を追加
- [x] Stripe APIルートの作成
- [x] プラン選択ページの作成
- [x] プラン制限の実装（タグ数）
- [x] 優先表示機能の実装
- [x] 注目のアイデア枠の実装
- [x] Navbarにプランリンクの追加
- [x] Webhook処理の実装

---

## 🚀 次のステップ（オプション）

1. **ブックマーク機能の実装**
   - ブックマーク数の制限チェック
   - ブックマーク一覧ページ

2. **Bloom Planの詳細設計**
   - 追加機能の定義
   - 価格設定

3. **プラン変更時の通知**
   - プランアップグレード時の通知
   - プランダウングレード時の通知

---

実装完了日: 2025年1月

