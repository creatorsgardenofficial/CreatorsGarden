# Neon DB スキーマセットアップガイド

Neon DBにデータベーススキーマを適用する方法を説明します。

## 🎯 現在の状況

✅ **データベース接続は成功しています**
- `CGDB_POSTGRES_URL_NON_POOLING`が正しく認識されています
- Neon DBへの接続も成功しています

❌ **テーブルが存在しません**
- `relation "users" does not exist` エラーが発生しています
- スキーマを適用する必要があります

## 📋 方法1: Neon DBダッシュボードから実行（推奨・最も簡単）

### 手順

1. **Neon DBダッシュボードにアクセス**
   - https://console.neon.tech にログイン
   - プロジェクトを選択

2. **SQL Editorを開く**
   - 左メニューから「SQL Editor」をクリック
   - または、プロジェクトの「SQL Editor」タブをクリック

3. **スキーマファイルの内容をコピー**
   - ローカルの `scripts/schema.sql` ファイルを開く
   - すべての内容をコピー（Ctrl+A → Ctrl+C）

4. **SQLを実行**
   - Neon DBダッシュボードのSQL Editorに貼り付け（Ctrl+V）
   - 「Run」または「Execute」ボタンをクリック
   - 成功メッセージが表示されれば完了です

### 成功時の確認

SQL Editorで以下のクエリを実行して、テーブルが作成されたことを確認できます：

```sql
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
- group_chats
- group_messages
- bookmarks
- password_reset_tokens
- blocked_users
- announcements
- security_logs

## 📋 方法2: ローカルからスクリプトで実行

### 前提条件

- Node.jsがインストールされていること
- `pg`パッケージがインストールされていること（`npm install`でインストール済み）

### 手順

1. **環境変数を設定**

   **PowerShellの場合:**
   ```powershell
   $env:CGDB_POSTGRES_URL_NON_POOLING="postgres://user:password@ep-xxx-xxx.region.aws.neon.tech/dbname?sslmode=require"
   ```

   **Bashの場合:**
   ```bash
   export CGDB_POSTGRES_URL_NON_POOLING="postgres://user:password@ep-xxx-xxx.region.aws.neon.tech/dbname?sslmode=require"
   ```

   **注意:** 接続文字列はVercelダッシュボードの環境変数から取得できます。

2. **スキーマを実行**
   ```bash
   npm run db:schema
   ```

### 成功時の出力例

```
🔗 データベースに接続しています...
   環境変数: CGDB_POSTGRES_URL_NON_POOLING

📖 スキーマファイルを読み込んでいます...
📝 15個のSQL文を検出しました。

🚀 データベーススキーマを実行しています...

  ✓ テーブル "users" を作成しました
  ✓ テーブル "posts" を作成しました
  ✓ テーブル "comments" を作成しました
  ✓ テーブル "feedback" を作成しました
  ✓ テーブル "messages" を作成しました
  ✓ テーブル "conversations" を作成しました
  ✓ テーブル "group_chats" を作成しました
  ✓ テーブル "group_messages" を作成しました
  ✓ テーブル "bookmarks" を作成しました
  ✓ テーブル "password_reset_tokens" を作成しました
  ✓ テーブル "blocked_users" を作成しました
  ✓ テーブル "announcements" を作成しました
  ✓ テーブル "security_logs" を作成しました

✅ スキーマの実行が完了しました！

📋 作成されたテーブルを確認中...

作成されたテーブル:
  ✓ announcements
  ✓ blocked_users
  ✓ bookmarks
  ✓ comments
  ✓ conversations
  ✓ feedback
  ✓ group_chats
  ✓ group_messages
  ✓ messages
  ✓ password_reset_tokens
  ✓ posts
  ✓ security_logs
  ✓ users

合計: 13個のテーブルが作成されました。
```

## 🔍 トラブルシューティング

### エラー: "relation already exists"

既にテーブルが存在する場合、`CREATE TABLE IF NOT EXISTS`を使用しているため、エラーは発生しませんが、警告が表示される場合があります。これは正常です。

### エラー: "permission denied"

データベースユーザーに適切な権限がない可能性があります。Neon DBのダッシュボードで、データベースユーザーの権限を確認してください。

### エラー: "connection refused" または "timeout"

- 接続文字列が正しいか確認してください
- Neon DBのIPアドレスが正しいか確認してください
- ファイアウォール設定を確認してください（Neon DBは通常、すべてのIPアドレスからの接続を許可しています）

## ✅ 次のステップ

スキーマの適用が完了したら：

1. **Vercelで再デプロイ**（自動的に再デプロイされる場合もあります）
2. **アプリケーションの動作確認**
   - ユーザー登録ができるか確認
   - ログインができるか確認
   - 投稿ができるか確認

## 📝 注意事項

- 本番環境のデータベースに接続する場合は、必ずバックアップを取ってから実行してください
- 既存のデータがある場合は、データの移行が必要になる場合があります
- スキーマファイル（`scripts/schema.sql`）は`CREATE TABLE IF NOT EXISTS`を使用しているため、既存のテーブルは上書きされません

