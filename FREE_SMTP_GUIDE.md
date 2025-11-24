# 無料で使えるSMTPサービス一覧

## 💰 費用について

**SMTPは無料で使用できます！** 専用のサービスに契約する必要はありません。

既存のメールアカウント（Gmail、Outlook、Yahooなど）でSMTPを使用できます。

---

## ✅ 無料で使えるSMTPサービス

### 1. Gmail（推奨）

**費用**: 完全無料

**設定方法**:
1. Googleアカウントで2段階認証を有効化
2. アプリパスワードを生成
3. 以下の設定を使用：

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-16-character-app-password
SMTP_FROM_EMAIL=your-email@gmail.com
SMTP_FROM_NAME=Creators Garden
```

**制限**:
- 1日あたり500通まで（通常の用途では十分）

**メリット**:
- 無料
- 設定が簡単
- 信頼性が高い

---

### 2. Outlook（Microsoft 365 / Hotmail）

**費用**: 完全無料

**設定方法**:
```env
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@outlook.com
SMTP_PASS=your-password
SMTP_FROM_EMAIL=your-email@outlook.com
SMTP_FROM_NAME=Creators Garden
```

**制限**:
- 1日あたり300通まで

**メリット**:
- 無料
- 設定が簡単
- Microsoftアカウントがあればすぐ使える

---

### 3. Yahooメール

**費用**: 完全無料

**設定方法**:
1. Yahooアカウントでアプリパスワードを生成
2. 以下の設定を使用：

```env
SMTP_HOST=smtp.mail.yahoo.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@yahoo.com
SMTP_PASS=your-app-password
SMTP_FROM_EMAIL=your-email@yahoo.com
SMTP_FROM_NAME=Creators Garden
```

**制限**:
- 1日あたり500通まで

---

### 4. その他の無料メールサービス

多くの無料メールサービスがSMTPを提供しています：
- iCloudメール
- Zoho Mail（無料プランあり）
- ProtonMail（有料プランのみSMTP対応）

---

## 📊 比較表

| サービス | 費用 | 1日の送信制限 | 設定の簡単さ |
|---------|------|--------------|------------|
| Gmail | 無料 | 500通 | ⭐⭐⭐⭐⭐ |
| Outlook | 無料 | 300通 | ⭐⭐⭐⭐⭐ |
| Yahoo | 無料 | 500通 | ⭐⭐⭐⭐ |
| SendGrid | 無料（100通/日） | 100通（無料） | ⭐⭐⭐ |
| Mailgun | 無料（5,000通/月） | 約166通/日 | ⭐⭐⭐ |

---

## 🎯 推奨事項

### 個人・小規模なサービス

**GmailまたはOutlookを推奨**
- 無料
- 設定が簡単
- パスワードリセット機能には十分

### 中規模以上のサービス

**専用のメール送信サービスを検討**
- SendGrid（無料プラン: 100通/日）
- Mailgun（無料プラン: 5,000通/月）
- AWS SES（従量課金、最初の62,000通/月は無料）

---

## ⚠️ 注意事項

### Gmailを使用する場合

1. **2段階認証が必須**
   - セキュリティ設定で有効化

2. **アプリパスワードが必要**
   - 通常のパスワードでは動作しません
   - アプリパスワードを生成する必要があります

3. **送信制限**
   - 1日あたり500通まで
   - 大量送信には不向き

### Outlookを使用する場合

1. **通常のパスワードでOK**
   - アプリパスワードは不要（通常）

2. **送信制限**
   - 1日あたり300通まで

---

## 🔧 設定例（Gmail）

### ステップ1: 2段階認証を有効化

1. https://myaccount.google.com/ にアクセス
2. 「セキュリティ」→「2段階認証プロセス」を有効化

### ステップ2: アプリパスワードを生成

1. 「セキュリティ」→「アプリパスワード」
2. 「アプリを選択」→「メール」
3. 「デバイスを選択」→「その他（カスタム名）」
4. 名前を入力（例：「Creators Garden」）
5. 「生成」をクリック
6. 16文字のパスワードをコピー

### ステップ3: .env.localに設定

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=abcdefghijklmnop
SMTP_FROM_EMAIL=your-email@gmail.com
SMTP_FROM_NAME=Creators Garden
```

---

## ✅ まとめ

- **SMTPは無料で使用できます**
- **契約は不要です**
- **既存のメールアカウントでOK**
- **GmailまたはOutlookがおすすめ**

パスワードリセット機能のような用途であれば、無料のメールサービスで十分です！

