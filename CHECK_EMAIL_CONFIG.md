# メール送信設定の確認方法

## 現在の状態

**コードは実装済みですが、`.env.local`ファイルにSMTP設定を追加する必要があります。**

## 確認方法

### 1. `.env.local`ファイルが存在するか確認

プロジェクトフォルダ（`C:\Users\yamada\Documents\creator-collab`）に`.env.local`ファイルがあるか確認してください。

### 2. SMTP設定があるか確認

`.env.local`ファイルを開いて、以下の設定があるか確認してください：

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM_EMAIL=your-email@gmail.com
SMTP_FROM_NAME=Creators Garden
```

### 3. 動作確認

**SMTP設定がある場合**:
- ✅ 実際のメールアドレスにメールが送信されます

**SMTP設定がない場合**:
- ⚠️ 開発環境では`data/emails/`フォルダにメール内容が保存されます
- ⚠️ 実際のメールアドレスには送信されません

## 設定が必要な理由

コードでは以下のように動作します：

```typescript
// app/api/auth/forgot-password/route.ts
if (isEmailConfigured()) {
  // SMTP設定がある場合: 実際にメールを送信
  await sendPasswordResetEmail(user.email, resetLink);
} else {
  // SMTP設定がない場合: ファイルに保存
  // （開発環境のみ）
}
```

`isEmailConfigured()`関数は、以下の環境変数がすべて設定されているかチェックします：
- `SMTP_HOST`
- `SMTP_USER`
- `SMTP_PASS`

これらの設定がない場合、実際のメールは送信されません。

## 次のステップ

1. `.env.local`ファイルを作成（まだない場合）
2. SMTP設定を追加
3. サーバーを再起動
4. パスワードリセット申請をテスト

詳細な手順は `ENV_LOCAL_SETUP_DETAILED.md` を参照してください。

