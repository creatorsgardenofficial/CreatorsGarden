# 価格ID確認レポート

## 📋 設定されている価格ID

```
price_1SU5j4DJywW1BMn4Paq7pnQl
```

## ✅ 確認結果

- **形式**: ✅ 正しい（`price_`で始まる）
- **設定状態**: ✅ `.env.local`に設定済み
- **コメントアウト**: ✅ されていない（有効）

## 🔍 価格IDの詳細

- **価格ID**: `price_1SU5j4DJywW1BMn4Paq7pnQl`
- **形式**: Stripe標準形式
- **長さ**: 28文字
- **プレフィックス**: `price_`（価格IDであることを示す）

## 📝 使用箇所

この価格IDは以下のAPIルートで使用されます：

- `app/api/stripe/create-checkout/route.ts`
  - Grow Planの決済セッション作成時に使用
  - 環境変数 `STRIPE_PRICE_ID_GROW` から読み込まれる

## 🧪 動作確認

価格IDが正しく設定されているか確認するには：

1. サーバーを起動: `npm run dev`
2. ブラウザで `http://localhost:3000/pricing` にアクセス
3. Grow Planの「プランを選択」ボタンをクリック
4. Stripeの決済画面が表示され、¥200/月のプランが表示されることを確認

## ⚠️ 注意事項

- この価格IDは**テストモード**用です
- 本番環境では、本番モードの価格IDを使用する必要があります
- 価格IDがStripeダッシュボードで削除された場合、エラーが発生します

## 📚 参考

- **Stripe価格ID**: https://stripe.com/docs/prices/overview
- **Stripeダッシュボード**: https://dashboard.stripe.com

