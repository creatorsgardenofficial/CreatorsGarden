# ローカルでデータベースを使用する設定方法

## ⚠️ 重要な注意事項

**本番環境と同じデータベースに接続しないでください！**

開発環境では、必ず**別のデータベース**を使用してください。本番環境のデータベースに接続すると、本番データが破壊される可能性があります。

## 手順

### 1. 開発用データベースの準備

#### オプション1: ローカルのPostgreSQLを使用（推奨）

ローカルでPostgreSQLを起動し、開発用データベースを作成します。

**PostgreSQLのインストール（まだの場合）:**
- Windows: https://www.postgresql.org/download/windows/
- Mac: `brew install postgresql`
- Linux: `sudo apt-get install postgresql`

**PostgreSQLの起動:**
- Windows: サービスとして自動起動される場合が多い
- Mac: `brew services start postgresql`
- Linux: `sudo systemctl start postgresql`

**開発用データベースの作成:**
```bash
# PostgreSQLに接続
psql -U postgres

# データベースを作成
CREATE DATABASE creators_garden_dev;

# ユーザーを作成（オプション）
CREATE USER dev_user WITH PASSWORD 'dev_password';
GRANT ALL PRIVILEGES ON DATABASE creators_garden_dev TO dev_user;

# 終了
\q
```

#### オプション2: Vercel Postgresで開発用データベースを作成

1. Vercelダッシュボードにログイン
2. プロジェクトを選択
3. 「Storage」タブをクリック
4. 「Create Database」をクリックして新しいデータベースを作成
5. データベース名を「creators-garden-dev」などに設定
6. 「Settings」タブで「Direct Connection」の接続文字列をコピー

### 2. `.env.local`ファイルを編集

プロジェクトルートの`.env.local`ファイルに以下を追加してください：

```env
# データベースを使用する設定
USE_DATABASE=true

# 開発用PostgreSQL接続文字列
# ローカルのPostgreSQLを使用する場合
POSTGRES_URL=postgres://dev_user:dev_password@localhost:5432/creators_garden_dev

# または、Vercel Postgresで開発用データベースを作成した場合
# POSTGRES_URL=postgres://user:password@aws-0-*.pooler.supabase.com:5432/creators_garden_dev
```

**重要**: 
- 本番環境の接続文字列は使用しないでください
- `db.prisma.io`や`accelerate.prisma.io`を含む接続文字列は使用しないでください
- 正しい接続文字列は`postgres://`で始まり、`localhost`（ローカル）または`aws-0-*.pooler.supabase.com`（Vercel Postgres）の形式です

### 3. 接続文字列の確認

`.env.local`に設定した接続文字列が正しいか確認してください：

**ローカルのPostgreSQLの場合:**
```env
POSTGRES_URL=postgres://username:password@localhost:5432/database_name
```

**Vercel Postgres（開発用）の場合:**
```env
POSTGRES_URL=postgres://user:password@aws-0-*.pooler.supabase.com:5432/database_name
```

**❌ 使用しないでください:**
- 本番環境の接続文字列
- `db.prisma.io`を含む接続文字列
- `accelerate.prisma.io`を含む接続文字列
- `prisma+postgres://`で始まる接続文字列

### 4. データベーススキーマの作成

開発用データベースにスキーマを作成します：

```bash
npm run db:schema
```

このコマンドは`.env.local`の`POSTGRES_URL`を使用してスキーマを作成します。

**注意**: このコマンドは開発用データベースにのみ実行してください。本番環境のデータベースには実行しないでください。

### 5. 開発サーバーの再起動

設定を反映するために、開発サーバーを再起動してください：

```bash
npm run dev
```

### 6. 動作確認

開発サーバーを起動した後、以下のログが表示されることを確認してください：

```
✅ Using connection string from: POSTGRES_URL
✅ PostgreSQL Pool created successfully
```

## トラブルシューティング

### エラー: "Database connection string is not set"

- `.env.local`に`USE_DATABASE=true`が設定されているか確認
- `.env.local`に`POSTGRES_URL`が設定されているか確認
- 開発サーバーを再起動したか確認

### エラー: "Failed to connect to database"

- PostgreSQLが起動しているか確認
- 接続文字列が正しいか確認（ユーザー名、パスワード、ホスト、ポート、データベース名）
- ファイアウォールでポート5432がブロックされていないか確認

### エラー: "relation does not exist"

- データベーススキーマが作成されているか確認
- `npm run db:schema`を実行してスキーマを作成

## 注意事項

- `.env.local`は`.gitignore`に含まれているため、Gitにはコミットされません
- 接続文字列には機密情報が含まれているため、絶対にGitにコミットしないでください
- **必ず開発用の別データベースを使用してください**（本番環境のデータベースは使用しない）
- ローカルのPostgreSQLを使用する場合、開発サーバー起動時にPostgreSQLが起動している必要があります
- 開発用データベースのデータは開発中に削除される可能性があるため、重要なデータは別途バックアップしてください

## 本番環境と開発環境の分離

- **開発環境（ローカル）**: `.env.local`の`POSTGRES_URL`を使用
- **本番環境（Vercel）**: Vercelダッシュボードの環境変数`POSTGRES_URL`を使用

これにより、開発環境と本番環境が完全に分離されます。

