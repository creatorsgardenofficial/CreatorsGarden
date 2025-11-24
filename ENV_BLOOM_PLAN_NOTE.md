# Bloom Plan環境変数について

## 📝 現在の状況

`.env.local`ファイルに`STRIPE_PRICE_ID_BLOOM`が設定されていませんが、**これは正常です**。

Bloom Planは現在準備中（Coming Soon）のため、環境変数を設定する必要はありません。

## ✅ 動作確認

現在のコードは、`STRIPE_PRICE_ID_BLOOM`が未設定でも正常に動作します：

- `bloomPriceId`が`undefined`の場合、`priceId === bloomPriceId`の比較は`false`になります
- そのため、Bloom Planの判定は行われず、既存のプラン（Free/Grow）のみが判定されます

## 🔮 Bloom Plan実装時

Bloom Planを実装する際は、以下の手順で環境変数を追加してください：

1. StripeダッシュボードでBloom Planの価格を作成
2. 価格ID（`price_...`で始まる）を取得
3. `.env.local`ファイルに以下を追加：

```env
STRIPE_PRICE_ID_BLOOM=price_xxxxxxxxxxxxx
```

## 📋 現在の環境変数設定

必須：
- `STRIPE_SECRET_KEY` ✅
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` ✅
- `STRIPE_PRICE_ID_GROW` ✅
- `NEXT_PUBLIC_BASE_URL` ✅

オプション（Bloom Plan準備中）：
- `STRIPE_PRICE_ID_BLOOM` ⏳ 未設定（準備中）
- `STRIPE_WEBHOOK_SECRET` ⚠️ コメントアウト（ローカル開発環境ではStripe CLIを使用）

## ⚠️ 注意事項

`STRIPE_WEBHOOK_SECRET`がコメントアウトされている場合：

- **ローカル開発環境**: Stripe CLIを使用してWebhookを転送する必要があります
- **本番環境**: Webhookエンドポイントを設定し、`STRIPE_WEBHOOK_SECRET`を設定する必要があります

詳細は `STRIPE_WEBHOOK_SETUP.md` を参照してください。

