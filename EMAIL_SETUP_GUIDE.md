# メール送信設定ガイド

パスワードリセット機能で実際のメールアドレスにメールを送信するための設定方法です。

## 💰 費用について

**SMTPは無料で使用できます！** 契約は不要です。

以下のメールサービスは無料でSMTPを使用できます：
- ✅ **Gmail** - 無料（アプリパスワードが必要）
- ✅ **Outlook** - 無料
- ✅ **Yahooメール** - 無料（アプリパスワードが必要）
- ✅ **その他の無料メールサービス** - 多くがSMTPを提供

**本番環境で大量のメールを送信する場合**のみ、専用のメール送信サービス（SendGrid、Mailgun、AWS SESなど）の使用を検討してください。通常のパスワードリセット機能であれば、無料のメールサービスで十分です。

---

## 📋 設定手順

### 1. .env.localファイルを作成する

まず、`.env.local`ファイルが存在するか確認してください。

**ファイルが存在しない場合**:
1. プロジェクトフォルダ（`C:\Users\yamada\Documents\creator-collab`）を開く
2. 新しいテキストファイルを作成
3. ファイル名を`.env.local`に変更（拡張子なし）

**ファイルが既に存在する場合**:
- そのまま編集してください

詳細な手順は `ENV_LOCAL_SETUP_DETAILED.md` を参照してください。

### 2. 環境変数の設定

`.env.local`ファイルに以下の環境変数を追加してください：

```env
# SMTP設定
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM_EMAIL=your-email@gmail.com
SMTP_FROM_NAME=Creators Garden
```

### 2. 各メールサービスの設定

#### Gmailを使用する場合

1. **Googleアカウントの設定**
   - Googleアカウントにログイン
   - 「セキュリティ」→「2段階認証プロセス」を有効化

2. **アプリパスワードの生成**
   - 「セキュリティ」→「アプリパスワード」
   - 「アプリを選択」→「メール」
   - 「デバイスを選択」→「その他（カスタム名）」
   - 生成された16文字のパスワードをコピー

3. **環境変数の設定**
   ```env
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-16-character-app-password
   SMTP_FROM_EMAIL=your-email@gmail.com
   SMTP_FROM_NAME=Creators Garden
   ```

#### Outlookを使用する場合

```env
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@outlook.com
SMTP_PASS=your-password
SMTP_FROM_EMAIL=your-email@outlook.com
SMTP_FROM_NAME=Creators Garden
```

#### Yahooメールを使用する場合

```env
SMTP_HOST=smtp.mail.yahoo.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@yahoo.com
SMTP_PASS=your-app-password
SMTP_FROM_EMAIL=your-email@yahoo.com
SMTP_FROM_NAME=Creators Garden
```

#### カスタムSMTPサーバーを使用する場合

```env
SMTP_HOST=your-smtp-server.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-username
SMTP_PASS=your-password
SMTP_FROM_EMAIL=noreply@yourdomain.com
SMTP_FROM_NAME=Creators Garden
```

**注意**: ポート465を使用する場合は`SMTP_SECURE=true`に設定してください。

### 3. 設定の確認

環境変数を設定したら、サーバーを再起動してください。

```bash
npm run dev
```

パスワードリセット申請を行うと、実際のメールアドレスにメールが送信されます。

## 🔍 トラブルシューティング

### メールが送信されない場合

1. **環境変数の確認**
   - `.env.local`ファイルに正しく設定されているか確認
   - サーバーを再起動したか確認

2. **ログの確認**
   - サーバーログでエラーメッセージを確認
   - `Failed to send password reset email`というエラーが出ていないか確認

3. **SMTP設定の確認**
   - ホスト名、ポート番号が正しいか確認
   - ユーザー名とパスワードが正しいか確認
   - ファイアウォールやセキュリティ設定でポートがブロックされていないか確認

4. **Gmailの場合**
   - アプリパスワードを使用しているか確認（通常のパスワードでは動作しません）
   - 2段階認証が有効になっているか確認

### 開発環境での動作確認

SMTP設定がない場合、開発環境ではメール内容が`data/emails/`フォルダに保存されます。

実際のメール送信をテストするには、上記の環境変数を設定してください。

## 📚 参考リンク

- [Nodemailer公式ドキュメント](https://nodemailer.com/about/)
- [Gmailアプリパスワードの生成方法](https://support.google.com/accounts/answer/185833)
- [Outlook SMTP設定](https://support.microsoft.com/ja-jp/office/outlook-com-%E3%81%AE-pop-imap-%E3%81%8A%E3%82%88%E3%81%B3-smtp-%E8%A8%AD%E5%AE%9A-8361e398-8af4-4e97-b147-6c6c4ac95353)

