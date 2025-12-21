# ローカルPostgreSQLデータベースへの接続手順

現在、`.env.local`には`db.prisma.io`（Prisma Accelerate）の接続文字列が設定されています。ローカルのPostgreSQLデータベースに接続するには、以下の手順を実行してください。

## 📋 前提条件

- PostgreSQLがインストールされていること
- PostgreSQLが起動していること

## 🚀 セットアップ手順

### ステップ1: `.env.local`ファイルの更新

`.env.local`ファイルを開き、以下の設定を追加または更新してください：

```env
# データベースを使用する設定
USE_DATABASE=true

# ローカルPostgreSQL接続文字列
# 形式: postgres://username:password@localhost:5432/database_name
POSTGRES_URL=postgres://postgres:your_password@localhost:5432/creators_garden_dev
```

**重要:**
- `postgres`はデフォルトのPostgreSQLユーザー名です（必要に応じて変更）
- `your_password`を実際のPostgreSQLパスワードに置き換えてください
- `creators_garden_dev`はデータベース名です（任意の名前に変更可能）

**現在の設定を削除またはコメントアウト:**
```env
# 以下の行をコメントアウトまたは削除
# POSTGRES_URL="postgres://...@db.prisma.io:5432/postgres?sslmode=require"
```

### ステップ2: ローカルPostgreSQLデータベースの作成

PostgreSQLに接続してデータベースを作成します：

**Windows (PowerShell):**
```powershell
# PostgreSQLに接続（パスワードを求められたら入力）
psql -U postgres

# PostgreSQLプロンプトで以下を実行:
CREATE DATABASE creators_garden_dev;

# 終了
\q
```

**Mac/Linux:**
```bash
# PostgreSQLに接続
psql -U postgres

# PostgreSQLプロンプトで以下を実行:
CREATE DATABASE creators_garden_dev;

# 終了
\q
```

### ステップ3: 接続テスト

接続をテストするために、以下のコマンドを実行してください：

```bash
node scripts/setup-local-postgres.js
```

このスクリプトは以下を実行します：
- `.env.local`の接続文字列を読み込む
- データベースが存在しない場合は作成
- 接続をテスト

**成功時の出力例:**
```
🚀 ローカルPostgreSQLデータベースのセットアップを開始します...

📋 接続情報:
   ホスト: localhost
   ポート: 5432
   データベース: creators_garden_dev
   ユーザー: postgres

📦 データベース "creators_garden_dev" の存在を確認中...
✅ データベース "creators_garden_dev" は既に存在します

🔗 データベース接続をテスト中...
✅ PostgreSQL接続成功
   バージョン: PostgreSQL 15.0

✅ セットアップが完了しました！

📝 次のステップ:
   1. データベーススキーマを作成: npm run db:schema
   2. 開発サーバーを起動: npm run dev
```

### ステップ4: データベーススキーマの作成

接続が成功したら、データベースにテーブルを作成します：

```bash
npm run db:schema
```

**成功時の出力例:**
```
📖 スキーマファイルを読み込んでいます...
📝 15個のSQL文を検出しました。

🚀 データベーススキーマを実行しています...

  ✓ テーブル "users" を作成しました
  ✓ テーブル "posts" を作成しました
  ✓ テーブル "comments" を作成しました
  ...

✅ スキーマの実行が完了しました！
```

### ステップ5: 開発サーバーの起動

設定を反映するために、開発サーバーを起動します：

```bash
npm run dev
```

**成功時のログ:**
```
✅ Using connection string from: POSTGRES_URL
✅ PostgreSQL Pool created successfully
```

### ステップ6: 動作確認

ブラウザで `http://localhost:3000` にアクセスし、アプリケーションが正常に動作することを確認してください。

## 🔧 トラブルシューティング

### エラー: "psql: command not found"

**原因:** PostgreSQLがインストールされていない、またはPATHに追加されていない

**解決方法:**
- Windows: PostgreSQLインストーラーで「コマンドラインツールをPATHに追加」を選択
- Mac: `brew install postgresql`
- Linux: `sudo apt-get install postgresql-client`

### エラー: "Connection refused" または "ECONNREFUSED"

**原因:** PostgreSQLが起動していない

**解決方法:**
- Windows: サービスが起動しているか確認（サービス管理ツール）
- Mac: `brew services start postgresql`
- Linux: `sudo systemctl start postgresql`

### エラー: "Authentication failed" または "28P01"

**原因:** ユーザー名またはパスワードが間違っている

**解決方法:**
- `.env.local`の接続文字列のユーザー名とパスワードを確認
- PostgreSQLのパスワードをリセットする場合は、`pg_hba.conf`を確認

### エラー: "Database does not exist"

**原因:** データベースが作成されていない

**解決方法:**
- ステップ2を実行してデータベースを作成
- または、`setup-local-postgres.js`スクリプトが自動的に作成します

### エラー: "Prisma Accelerate endpoint detected"

**原因:** `.env.local`に`db.prisma.io`の接続文字列が残っている

**解決方法:**
- `.env.local`を開き、`db.prisma.io`を含む行を削除またはコメントアウト
- ローカルPostgreSQLの接続文字列に置き換え

## 📝 接続文字列の例

### デフォルト設定（postgresユーザー）
```
POSTGRES_URL=postgres://postgres:password@localhost:5432/creators_garden_dev
```

### カスタムユーザー
```
POSTGRES_URL=postgres://myuser:mypassword@localhost:5432/creators_garden_dev
```

### 別のポートを使用する場合
```
POSTGRES_URL=postgres://postgres:password@localhost:5433/creators_garden_dev
```

## 🔒 セキュリティ注意事項

- `.env.local`は`.gitignore`に含まれているため、Gitにはコミットされません
- 接続文字列には機密情報が含まれているため、絶対にGitにコミットしないでください
- 開発環境と本番環境で必ず別のデータベースを使用してください

## 📚 参考資料

- [POSTGRESQL_SETUP_GUIDE.md](./POSTGRESQL_SETUP_GUIDE.md) - 詳細な移行ガイド
- [SETUP_LOCAL_DATABASE.md](./SETUP_LOCAL_DATABASE.md) - ローカルデータベース設定の詳細

