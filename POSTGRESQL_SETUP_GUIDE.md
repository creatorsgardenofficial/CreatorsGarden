# PostgreSQLデータベースへの移行ガイド

このガイドでは、ローカルのファイルシステム（JSONファイル）からPostgreSQLデータベースに移行する手順を説明します。

## 📋 前提条件

- PostgreSQLがインストールされていること（またはVercel Postgresの開発用データベースが作成されていること）
- Node.jsとnpmがインストールされていること

## 🚀 セットアップ手順

### ステップ1: `.env.local`ファイルの作成

プロジェクトルートに`.env.local`ファイルを作成し、以下の設定を追加してください：

```env
# データベースを使用する設定
USE_DATABASE=true

# PostgreSQL接続文字列
# ローカルのPostgreSQLを使用する場合:
POSTGRES_URL=postgres://username:password@localhost:5432/creators_garden_dev

# または、Vercel Postgres（開発用）を使用する場合:
# POSTGRES_URL=postgres://user:password@aws-0-*.pooler.supabase.com:5432/database_name
```

**重要:**
- `username`, `password`, `database_name`を実際の値に置き換えてください
- 本番環境の接続文字列は使用しないでください
- `db.prisma.io`や`accelerate.prisma.io`を含む接続文字列は使用しないでください

### ステップ2: ローカルPostgreSQLデータベースの作成（ローカルPostgreSQLを使用する場合）

ローカルのPostgreSQLを使用する場合、以下のコマンドでデータベースを作成してください：

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

### ステップ3: データベーススキーマの作成

データベースにテーブルを作成するために、以下のコマンドを実行してください：

```bash
npm run db:schema
```

このコマンドは`.env.local`の`POSTGRES_URL`を使用してスキーマを作成します。

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

### ステップ4: 開発サーバーの起動

設定を反映するために、開発サーバーを再起動してください：

```bash
npm run dev
```

**成功時のログ:**
```
✅ Using connection string from: POSTGRES_URL
✅ PostgreSQL Pool created successfully
```

### ステップ5: 動作確認

ブラウザで `http://localhost:3000` にアクセスし、アプリケーションが正常に動作することを確認してください。

## 📊 データの移行（オプション）

既存のJSONファイル（`data/`フォルダ内）のデータをPostgreSQLに移行したい場合は、以下の手順を実行してください：

1. **ユーザーデータの移行**
   - `data/users.json`の内容を確認
   - 必要に応じて、管理画面からユーザーを再作成

2. **投稿データの移行**
   - `data/posts.json`の内容を確認
   - 必要に応じて、投稿を再作成

3. **その他のデータ**
   - コメント、メッセージ、ブックマークなども同様に移行

**注意:** 本番環境のデータベースに接続しないでください。開発環境では必ず別のデータベースを使用してください。

## 🔧 トラブルシューティング

### エラー: "Database connection string is not set"

**原因:** `.env.local`に`USE_DATABASE=true`または`POSTGRES_URL`が設定されていない

**解決方法:**
1. `.env.local`ファイルがプロジェクトルートに存在するか確認
2. `USE_DATABASE=true`が設定されているか確認
3. `POSTGRES_URL`が正しく設定されているか確認
4. 開発サーバーを再起動

### エラー: "Failed to connect to database"

**原因:** PostgreSQLに接続できない

**解決方法:**
1. PostgreSQLが起動しているか確認
   - Windows: サービスが起動しているか確認
   - Mac: `brew services list`で確認
   - Linux: `sudo systemctl status postgresql`で確認
2. 接続文字列が正しいか確認（ユーザー名、パスワード、ホスト、ポート、データベース名）
3. ファイアウォールでポート5432がブロックされていないか確認

### エラー: "relation does not exist"

**原因:** データベーススキーマが作成されていない

**解決方法:**
```bash
npm run db:schema
```

### エラー: "Prisma Accelerate account limit reached"

**原因:** Prisma Accelerateエンドポイント（`db.prisma.io`）を使用している

**解決方法:**
- Vercel Postgresの「Direct Connection」文字列を使用してください
- Vercelダッシュボード → Storage → Your Database → Settings → "Direct Connection"をコピー

## 📝 接続文字列の形式

### ローカルPostgreSQL
```
postgres://username:password@localhost:5432/database_name
```

### Vercel Postgres（開発用）
```
postgres://user:password@aws-0-*.pooler.supabase.com:5432/database_name
```

### ❌ 使用しないでください
- `db.prisma.io`を含む接続文字列
- `accelerate.prisma.io`を含む接続文字列
- `prisma+postgres://`で始まる接続文字列
- 本番環境の接続文字列

## 🔒 セキュリティ注意事項

- `.env.local`は`.gitignore`に含まれているため、Gitにはコミットされません
- 接続文字列には機密情報が含まれているため、絶対にGitにコミットしないでください
- 開発環境と本番環境で必ず別のデータベースを使用してください

## 📚 参考資料

- [SETUP_LOCAL_DATABASE.md](./SETUP_LOCAL_DATABASE.md) - ローカルデータベース設定の詳細
- [VERCEL_POSTGRES_SETUP.md](./VERCEL_POSTGRES_SETUP.md) - Vercel Postgres設定の詳細

