# pgAdminでNeon DBに接続する方法

pgAdminを使ってNeon DBに接続し、SQLを実行する手順を説明します。

## 📋 前提条件

- pgAdminがインストールされていること
- Neon DBの接続文字列（`CGDB_POSTGRES_URL_NON_POOLING`など）が分かっていること

## 🔍 ステップ1: 接続情報を取得

### 方法A: スクリプトを使用（推奨）

接続文字列から接続情報を自動的に抽出します：

```bash
# 環境変数が設定されている場合
npm run db:parse-connection

# または、接続文字列を直接指定
node scripts/parse-connection-string.js "postgres://user:password@host:port/database"
```

### 方法B: 手動で接続文字列を解析

接続文字列の形式：
```
postgres://username:password@ep-xxx-xxx.region.aws.neon.tech/dbname?sslmode=require
```

**解析方法:**
- `postgres://` の後が `username:password@`
- `@` の後が `host:port/database`
- Neon DBの場合、ポートは通常 `5432`（省略可能）

**例:**
```
postgres://neondb_owner:abc123@ep-wandering-boat-a414ro54.us-east-1.aws.neon.tech/neondb?sslmode=require
```

- **Host**: `ep-wandering-boat-a414ro54.us-east-1.aws.neon.tech`
- **Port**: `5432`（省略されている場合）
- **Database**: `neondb`
- **User**: `neondb_owner`
- **Password**: `abc123`

## 🔧 ステップ2: pgAdminでサーバーを登録

1. **pgAdminを起動**
   - pgAdmin 4を起動します

2. **サーバーを登録**
   - 左側の「Servers」を右クリック
   - 「Register」 → 「Server...」を選択

3. **「General」タブで設定**
   ```
   Name: Neon DB
   ```
   （任意の名前でOK）

4. **「Connection」タブで設定**
   ```
   Host name/address: ep-wandering-boat-a414ro54.us-east-1.aws.neon.tech
   Port: 5432
   Maintenance database: neondb
   Username: neondb_owner
   Password: abc123
   ```
   
   ⚠️ **重要**: 「Save password」にチェックを入れると、次回からパスワードを入力する必要がなくなります。

5. **「SSL」タブで設定**
   ```
   SSL mode: Require
   ```
   
   ⚠️ **重要**: Neon DBはSSL接続が必須です。SSL modeを「Require」に設定してください。

6. **接続を保存**
   - 「Save」をクリック
   - 接続が成功すると、左側のサーバーツリーに「Neon DB」が表示されます

## 📝 ステップ3: SQLを実行

1. **データベースを展開**
   - 左側の「Neon DB」を展開
   - 「Databases」 → 「neondb」（またはデータベース名）を展開

2. **Query Toolを開く**
   - 「neondb」を右クリック
   - 「Query Tool」を選択
   - または、ツールバーの「Query Tool」アイコンをクリック

3. **SQLを実行**
   - `scripts/schema.sql` の内容をコピー
   - Query Toolのエディタに貼り付け
   - 「Execute」ボタン（▶）をクリック、または `F5` キーを押す

4. **結果を確認**
   - 下部の「Messages」タブで実行結果を確認
   - 「Data Output」タブでクエリ結果を確認

## ✅ スキーマ適用の確認

スキーマが正しく適用されたか確認するには、以下のSQLを実行してください：

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;
```

以下のテーブルが表示されれば成功です：
- `announcements`
- `blocked_users`
- `bookmarks`
- `comments`
- `conversations`
- `feedback`
- `group_chats`
- `group_messages`
- `messages`
- `password_reset_tokens`
- `posts`
- `security_logs`
- `users`

## 🔍 トラブルシューティング

### エラー: "could not connect to server"

**原因:**
- ホスト名が間違っている
- ポート番号が間違っている
- ファイアウォールでブロックされている

**解決方法:**
- 接続文字列を再確認
- Neon DBのダッシュボードで接続文字列を確認
- インターネット接続を確認

### エラー: "password authentication failed"

**原因:**
- ユーザー名またはパスワードが間違っている

**解決方法:**
- 接続文字列からユーザー名とパスワードを正確に抽出
- Neon DBのダッシュボードで接続文字列を再確認

### エラー: "SSL connection required"

**原因:**
- SSL設定が無効になっている

**解決方法:**
- 「SSL」タブで「SSL mode」を「Require」に設定
- 接続文字列に `?sslmode=require` が含まれているか確認

### エラー: "database does not exist"

**原因:**
- データベース名が間違っている

**解決方法:**
- 接続文字列からデータベース名を正確に抽出
- Neon DBのダッシュボードでデータベース名を確認

### エラー: "timeout expired"

**原因:**
- ネットワーク接続の問題
- Neon DBの接続制限に達している

**解決方法:**
- インターネット接続を確認
- しばらく待ってから再接続
- Neon DBのダッシュボードで接続状態を確認

## 💡 便利な機能

### 1. 接続情報を保存

「Save password」にチェックを入れると、次回からパスワードを入力する必要がなくなります。

### 2. 複数の接続を管理

複数のデータベース（開発環境、本番環境など）に接続する場合、それぞれ別のサーバーとして登録できます。

### 3. SQLスクリプトの保存

Query Toolで実行したSQLは、ファイルとして保存できます：
- 「File」 → 「Save」で保存
- 次回は「File」 → 「Open」で開く

### 4. クエリ結果のエクスポート

Query Toolで実行したクエリの結果をCSVやJSON形式でエクスポートできます：
- 結果を右クリック → 「Export/Import」 → 「Export...」

## 📚 参考情報

- [pgAdmin公式ドキュメント](https://www.pgadmin.org/docs/)
- [Neon DB公式ドキュメント](https://neon.tech/docs)
- [PostgreSQL SSL接続ガイド](https://www.postgresql.org/docs/current/libpq-ssl.html)

