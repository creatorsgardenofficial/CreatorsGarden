# Vercel Postgres セットアップガイド

このガイドでは、Creators GardenアプリケーションにVercel Postgresを導入する手順を説明します。

## 1. Vercel Postgresの作成

### 手順

1. **Vercelダッシュボードにアクセス**
   - [https://vercel.com](https://vercel.com) にログイン
   - プロジェクトのダッシュボードを開く

2. **Storageタブを開く**
   - プロジェクトの「Storage」タブをクリック
   - 「Create Database」をクリック

3. **Prisma Postgresを選択**
   - Marketplaceから「Prisma Postgres」を選択
   - データベース名を入力（例: `creators-garden-db`）
   - リージョンを選択（推奨: アプリケーションと同じリージョン）
   - 「Continue」をクリック

4. **環境変数の確認**
   - データベース作成後、以下の環境変数が自動的に設定されます：
     - `POSTGRES_URL`
     - `POSTGRES_PRISMA_URL`
     - `POSTGRES_URL_NON_POOLING`

## 2. データベーススキーマの作成

### 方法1: Vercelダッシュボードから実行（推奨・最も簡単）

1. **Vercelダッシュボードでデータベースを開く**
   - Storageタブ → 作成したデータベース（例: `creators-garden-db`）をクリック

2. **「Query」タブまたは「SQL Editor」を開く**
   - データベースの詳細ページで「Query」または「SQL Editor」タブをクリック
   - SQLクエリを実行できるエディタが表示されます

3. **スキーマファイルの内容をコピー**
   - `scripts/schema.sql` ファイルを開く
   - すべての内容をコピー（Ctrl+A → Ctrl+C）

4. **SQLを実行**
   - VercelダッシュボードのSQLエディタに貼り付け（Ctrl+V）
   - 「Run」または「Execute」ボタンをクリック
   - 成功メッセージが表示されれば完了です

### 方法2: ローカルからpsqlコマンドで実行

**前提条件**: `psql`がインストールされている必要があります

1. **環境変数を取得**
   - Vercelダッシュボード → プロジェクト設定 → Environment Variables
   - `POSTGRES_URL`または`POSTGRES_URL_NON_POOLING`の値をコピー

2. **ローカルで環境変数を設定**
   ```bash
   # Windows PowerShell
   $env:POSTGRES_URL="postgres://..."
   
   # または .env.local に追加
   POSTGRES_URL=postgres://...
   ```

3. **SQLファイルを実行**
   ```bash
   # psqlコマンドで実行
   psql $POSTGRES_URL < scripts/schema.sql
   
   # または、Windows PowerShellの場合
   Get-Content scripts/schema.sql | psql $env:POSTGRES_URL
   ```

### 方法3: Node.jsスクリプトで実行（開発用）

```bash
# 実行スクリプトを作成（今後追加予定）
node scripts/run-schema.js
```

## 3. スキーマ実行の確認

### テーブルが作成されたか確認

VercelダッシュボードのSQLエディタで以下を実行：

```sql
-- すべてのテーブルを確認
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;
```

以下のテーブルが表示されれば成功です：
- users
- posts
- comments
- feedback
- messages
- conversations
- group_messages
- group_chats
- bookmarks
- password_reset_tokens
- blocked_users
- announcements
- security_logs

## 4. 環境変数の設定

### 開発環境（.env.local）

開発環境でもデータベースを使用する場合：

```env
# Vercel Postgresの環境変数（Vercelダッシュボードからコピー）
POSTGRES_URL=postgres://...
POSTGRES_PRISMA_URL=postgres://...
POSTGRES_URL_NON_POOLING=postgres://...

# 開発環境でもデータベースを使用する場合
USE_DATABASE=true
```

### 本番環境（Vercel環境変数）

**注意**: データベース作成時に自動設定されるため、手動で追加する必要はありません。

## 5. 動作確認

### データベース接続の確認

```bash
# 開発サーバーを起動
npm run dev

# ブラウザで以下にアクセスして新規登録を試す
# http://localhost:3000/register
```

### ログの確認

Vercelダッシュボードの「Logs」タブで、データベース接続エラーがないか確認してください。

## 6. トラブルシューティング

### エラー: "relation does not exist"

**原因**: データベーススキーマが作成されていない

**解決方法**:
1. VercelダッシュボードのSQLエディタで`scripts/schema.sql`を実行
2. テーブルが作成されているか確認（上記の確認SQLを実行）

### エラー: "Database connection failed"

**原因**: 環境変数が正しく設定されていない

**解決方法**:
1. Vercelダッシュボードで環境変数を確認
2. `.env.local`に環境変数が設定されているか確認
3. 環境変数名が正しいか確認（`POSTGRES_URL`など）

### エラー: "permission denied"

**原因**: データベースへのアクセス権限がない

**解決方法**:
1. Vercelダッシュボードでデータベースの設定を確認
2. プロジェクトがデータベースに接続されているか確認

## 7. 次のステップ

- [x] Vercel Postgresの作成
- [ ] データベーススキーマの作成（`scripts/schema.sql`を実行）
- [ ] 環境変数の確認
- [ ] 動作確認（新規登録を試す）
- [ ] 既存データの移行（必要に応じて）

## 参考リンク

- [Vercel Postgres Documentation](https://vercel.com/docs/storage/vercel-postgres)
- [@vercel/postgres Package](https://www.npmjs.com/package/@vercel/postgres)
- [Prisma Postgres Documentation](https://www.prisma.io/docs)
