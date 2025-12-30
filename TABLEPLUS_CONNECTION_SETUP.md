# TablePlusでVercel Postgresに接続する方法

## 接続文字列から情報を抽出

Vercel Postgresの接続文字列は以下の形式です：

```
postgres://user:password@host:port/database
```

### 例：
```
postgres://default:password123@aws-0-ap-northeast-1.pooler.supabase.com:6543/verceldb
```

## TablePlusの接続設定

### 1. 接続文字列を解析

接続文字列を以下のように分解します：

- **Host**: `aws-0-ap-northeast-1.pooler.supabase.com`（`@`の後、`:`の前）
- **Port**: `6543`（ホスト名の後の数字、デフォルトは5432または6543）
- **User**: `default`（`postgres://`の後、`:`の前）
- **Password**: `password123`（ユーザー名の後、`@`の前）
- **Database**: `verceldb`（最後の`/`の後）

### 2. TablePlusでの設定

1. **Name**（接続名）: 任意の名前（例: "Vercel Postgres Production"）

2. **Host**: 接続文字列から抽出したホスト名
   - 例: `aws-0-ap-northeast-1.pooler.supabase.com`

3. **Port**: 接続文字列から抽出したポート番号
   - 例: `6543` または `5432`
   - ポートが指定されていない場合は `5432`

4. **User**: 接続文字列から抽出したユーザー名
   - 例: `default` または `postgres`
   - ドロップダウンから選択する場合は、接続文字列のユーザー名と同じものを選択

5. **Password**: 接続文字列から抽出したパスワード
   - 例: `password123`

6. **Database**: 接続文字列から抽出したデータベース名
   - 例: `verceldb` または `postgres`
   - ドロップダウンから選択する場合は、接続文字列のデータベース名と同じものを選択

7. **Role**: 通常はUserと同じ、または空欄（デフォルトロールを使用）
   - ドロップダウンから選択する場合は、Userと同じものを選択するか、空欄のまま

8. **SSL**: 有効にする（Vercel PostgresはSSL接続が必須）
   - SSLタブまたはAdvancedタブで設定
   - SSL Mode: `require` または `prefer`

## 接続文字列の解析方法（手動）

接続文字列が以下の場合：
```
postgres://default:password123@aws-0-ap-northeast-1.pooler.supabase.com:6543/verceldb
```

### ステップバイステップ：

1. `postgres://` を削除
2. `:` で分割 → `default`（ユーザー名）と `password123@aws-0-...`（残り）
3. `@` で分割 → `password123`（パスワード）と `aws-0-...`（ホスト以降）
4. ホスト以降を `:` で分割 → `aws-0-ap-northeast-1.pooler.supabase.com`（ホスト）と `6543/verceldb`（ポートとDB）
5. ポートとDBを `/` で分割 → `6543`（ポート）と `verceldb`（データベース）

## よくある設定値

### Vercel Postgres（本番環境）

- **Host**: `aws-0-*.pooler.supabase.com` または `*.pooler.supabase.com`
- **Port**: `6543`（プーラー経由）または `5432`（直接接続）
- **User**: `default` または接続文字列に指定されたユーザー名
- **Database**: `verceldb` または接続文字列に指定されたデータベース名
- **SSL**: 必須（`require`）

### ローカルPostgreSQL

- **Host**: `localhost` または `127.0.0.1`
- **Port**: `5432`
- **User**: `postgres`
- **Database**: `creators_garden_dev` または設定したデータベース名
- **SSL**: 不要（無効）

## トラブルシューティング

### エラー: "password authentication failed"

- パスワードが正しいか確認
- 接続文字列からパスワードを正確に抽出できているか確認

### エラー: "SSL connection required"

- SSL設定を有効にする
- SSL Modeを `require` に設定

### エラー: "database does not exist"

- データベース名が正しいか確認
- 接続文字列からデータベース名を正確に抽出できているか確認

### User/Roleの選択

- ドロップダウンに表示されるユーザーは、データベースに存在するユーザーです
- 接続文字列のユーザー名と同じものを選択してください
- 表示されない場合は、接続文字列のユーザー名を手動で入力してください





