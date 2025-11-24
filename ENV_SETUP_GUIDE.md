# 環境変数設定ガイド

## 📝 概要

このガイドでは、Creators GardenのStripe決済機能を有効にするための環境変数の設定方法を説明します。

---

## 🔧 設定手順

### 1. `.env.local`ファイルの確認

プロジェクトルート（`creator-collab`フォルダ）に`.env.local`ファイルが作成されていることを確認してください。

### 2. Stripeアカウントの作成とAPIキーの取得

1. [Stripe](https://stripe.com)にアクセスしてアカウントを作成（無料）
2. ダッシュボードにログイン: https://dashboard.stripe.com
3. 「開発者」→「APIキー」を開く
4. 以下のキーをコピー：
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

`.env.local`ファイルを開き、以下を実際の値に置き換えてください：

```env
# Stripe API Keys
STRIPE_SECRET_KEY=sk_test_実際のシークレットキー
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_実際の公開キー

# Stripe Price IDs
STRIPE_PRICE_ID_GROW=price_実際の価格ID

# ベースURL（開発環境）
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

**注意**: 
- `STRIPE_WEBHOOK_SECRET`は後で設定します（Webhook設定時）
- `STRIPE_PRICE_ID_BLOOM`はBloom Plan実装時に設定

### 5. サーバーの再起動

環境変数を変更した後は、開発サーバーを再起動してください：

```bash
# サーバーを停止（Ctrl+C）
# その後、再起動
npm run dev
```

---

## 🔍 設定確認

### 環境変数が正しく読み込まれているか確認

1. 開発サーバーを起動
2. ブラウザで `http://localhost:3000/pricing` にアクセス
3. ブラウザのコンソール（F12）でエラーがないか確認
4. サーバーのコンソールで警告メッセージがないか確認

### よくあるエラー

#### 警告: "STRIPE_SECRET_KEYが設定されていません"

→ `.env.local`の`STRIPE_SECRET_KEY`が正しく設定されているか確認
→ サーバーを再起動してください

#### エラー: "プランの価格IDが設定されていません"

→ `.env.local`の`STRIPE_PRICE_ID_GROW`が正しく設定されているか確認
→ 価格IDが`price_`で始まっているか確認

#### エラー: "Stripe公開キーが設定されていません"

→ `.env.local`の`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`が正しく設定されているか確認
→ `NEXT_PUBLIC_`プレフィックスが付いているか確認

---

## 📋 チェックリスト

- [ ] Stripeアカウントを作成
- [ ] APIキーを取得（シークレットキーと公開キー）
- [ ] 価格（プラン）を作成
- [ ] `.env.local`ファイルを作成
- [ ] 環境変数を設定
- [ ] サーバーを再起動
- [ ] プランページにアクセスして動作確認

---

## 🚀 次のステップ

環境変数の設定が完了したら、以下を確認してください：

1. **プランページの表示**: `http://localhost:3000/pricing`
2. **決済フローのテスト**: Grow Planを選択してStripe決済画面が表示されるか確認
3. **Webhookの設定**: 本番環境またはStripe CLIを使用する場合（詳細は`STRIPE_SETUP.md`を参照）

---

## 📚 参考資料

- **クイックスタート**: `QUICK_START_STRIPE.md`
- **詳細セットアップ**: `STRIPE_SETUP.md`
- **Stripe公式ドキュメント**: https://stripe.com/docs

---

設定完了後、Stripe決済機能が利用可能になります！🎉

