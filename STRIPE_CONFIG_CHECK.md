# Stripe設定確認レポート

## ✅ 設定済み項目

1. **STRIPE_SECRET_KEY**: ✅ 設定済み
   - 形式: `sk_test_...`（テストモード）
   - 状態: 正常

2. **NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY**: ✅ 設定済み
   - 形式: `pk_test_...`（テストモード）
   - 状態: 正常

3. **NEXT_PUBLIC_BASE_URL**: ✅ 設定済み
   - 値: `http://localhost:3000`
   - 状態: 正常

---

## ⚠️ 修正が必要な項目

### STRIPE_PRICE_ID_GROW

**現在の状態**: コメントアウトされている、または製品ID（`prod_`）が設定されている

**問題点**:
- 価格IDは`price_`で始まる必要があります
- 製品ID（`prod_`）ではなく、価格ID（`price_`）を設定する必要があります
- コメントアウト（`#`）されている場合は、コメントを外す必要があります

**修正方法**:

1. Stripeダッシュボードで「製品」→「価格」を開く
2. 作成した価格（¥200/月）をクリック
3. 価格の詳細ページで「価格ID」（`price_...`で始まる）をコピー
4. `.env.local`ファイルを開き、以下の行を修正：

```env
# 修正前（コメントアウトされている場合）
#STRIPE_PRICE_ID_GROW=prod_TQxePKFobXjHmj

# 修正後（コメントを外し、価格IDを設定）
STRIPE_PRICE_ID_GROW=price_1ABC123def456GHI789
```

**注意**: `price_1ABC123def456GHI789`は実際の価格IDに置き換えてください。

---

## 🔍 価格IDと製品IDの違い

- **製品ID（Product ID）**: `prod_...`で始まる
  - 製品（プラン）そのものを表す
  - 例: `prod_TQxePKFobXjHmj`

- **価格ID（Price ID）**: `price_...`で始まる
  - 製品の価格（金額、請求期間など）を表す
  - 例: `price_1ABC123def456GHI789`
  - **こちらを設定する必要があります**

---

## ✅ 修正後の確認

修正後、以下のコマンドで確認できます：

```bash
npm run dev
```

サーバーを起動し、ブラウザで `http://localhost:3000/pricing` にアクセスして、Grow Planの「プランを選択」ボタンをクリックしてください。

正常に動作すれば、Stripeの決済画面が表示されます。

---

## 📋 チェックリスト

- [x] STRIPE_SECRET_KEY: 設定済み
- [x] NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: 設定済み
- [ ] STRIPE_PRICE_ID_GROW: **修正が必要**（価格IDを設定）
- [ ] サーバーを再起動
- [ ] 動作確認

---

価格IDを設定すれば、Stripe決済機能が利用可能になります！

