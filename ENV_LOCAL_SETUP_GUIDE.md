# .env.local の設定値ガイド

## 基本的な設定

`.env.local`ファイルに以下の設定を追加してください：

```env
# データベースを使用する設定
USE_DATABASE=true

# ローカルPostgreSQL接続文字列
POSTGRES_URL=postgres://postgres:your_password@localhost:5432/creators_garden_dev
```

## 各パラメータの説明

### 1. USE_DATABASE

```env
USE_DATABASE=true
```

- **値**: `true`（固定）
- **説明**: データベースを使用することを明示的に指定
- **変更不要**: この値のまま使用してください

### 2. POSTGRES_URL

接続文字列の形式：
```
postgres://[username]:[password]@[host]:[port]/[database_name]
```

#### パラメータの詳細

##### username（ユーザー名）

**デフォルト値**: `postgres`

PostgreSQLのデフォルトのスーパーユーザーです。通常はこのまま使用します。

**確認方法:**
```bash
psql -U postgres -c "SELECT current_user;"
```

**カスタムユーザーを作成した場合:**
```env
POSTGRES_URL=postgres://myuser:password@localhost:5432/creators_garden_dev
```

##### password（パスワード）

**設定方法**: PostgreSQLインストール時に設定したパスワード

PostgreSQLをインストールした際に設定したパスワードを入力してください。

**パスワードを忘れた場合:**
1. Windows: PostgreSQLの設定ファイルを確認
2. Mac/Linux: `pg_hba.conf`を確認
3. または、PostgreSQLを再インストールしてパスワードを設定

**パスワードに特殊文字が含まれる場合:**
URLエンコードが必要な場合があります：
- `@` → `%40`
- `#` → `%23`
- `%` → `%25`
- など

例：
```env
# パスワードが "p@ss#word" の場合
POSTGRES_URL=postgres://postgres:p%40ss%23word@localhost:5432/creators_garden_dev
```

##### host（ホスト）

**ローカル環境**: `localhost`

ローカルのPostgreSQLに接続する場合は、常に`localhost`を使用します。

##### port（ポート）

**デフォルト値**: `5432`

PostgreSQLのデフォルトポートです。通常はこのまま使用します。

**別のポートを使用している場合:**
```env
POSTGRES_URL=postgres://postgres:password@localhost:5433/creators_garden_dev
```

##### database_name（データベース名）

**推奨値**: `creators_garden_dev`

開発用のデータベース名です。任意の名前に変更できます。

**データベースが存在しない場合:**
以下のコマンドで作成できます：
```bash
psql -U postgres
CREATE DATABASE creators_garden_dev;
\q
```

または、`setup-local-postgres.js`スクリプトが自動的に作成します。

## 設定例

### 例1: デフォルト設定（推奨）

```env
USE_DATABASE=true
POSTGRES_URL=postgres://postgres:mypassword@localhost:5432/creators_garden_dev
```

- ユーザー名: `postgres`（デフォルト）
- パスワード: `mypassword`（実際のパスワードに置き換え）
- ホスト: `localhost`
- ポート: `5432`（デフォルト）
- データベース: `creators_garden_dev`

### 例2: カスタムユーザー

```env
USE_DATABASE=true
POSTGRES_URL=postgres://dev_user:dev_password@localhost:5432/creators_garden_dev
```

カスタムユーザーを作成した場合：
```bash
psql -U postgres
CREATE USER dev_user WITH PASSWORD 'dev_password';
GRANT ALL PRIVILEGES ON DATABASE creators_garden_dev TO dev_user;
\q
```

### 例3: 別のポート

```env
USE_DATABASE=true
POSTGRES_URL=postgres://postgres:password@localhost:5433/creators_garden_dev
```

### 例4: パスワードに特殊文字が含まれる場合

```env
USE_DATABASE=true
POSTGRES_URL=postgres://postgres:p%40ss%23word@localhost:5432/creators_garden_dev
```

パスワードが `p@ss#word` の場合

## 設定手順

### ステップ1: PostgreSQLのパスワードを確認

PostgreSQLインストール時に設定したパスワードを確認してください。

**Windows:**
- PostgreSQLインストール時に設定したパスワードを確認
- または、PostgreSQLの設定ファイルを確認

**Mac/Linux:**
```bash
# PostgreSQLに接続を試みる（パスワードを求められる）
psql -U postgres
```

### ステップ2: データベースの作成

```bash
# PostgreSQLに接続
psql -U postgres

# データベースを作成
CREATE DATABASE creators_garden_dev;

# 終了
\q
```

### ステップ3: .env.localの編集

プロジェクトルートの`.env.local`ファイルを開き、以下を追加：

```env
USE_DATABASE=true
POSTGRES_URL=postgres://postgres:実際のパスワード@localhost:5432/creators_garden_dev
```

**重要**: `実際のパスワード`をPostgreSQLのパスワードに置き換えてください。

### ステップ4: 接続テスト

```bash
node scripts/setup-local-postgres.js
```

成功すると、以下のような出力が表示されます：
```
✅ PostgreSQL接続成功
   バージョン: PostgreSQL 15.0
```

## トラブルシューティング

### エラー: "password authentication failed"

**原因**: パスワードが間違っている

**解決方法:**
1. `.env.local`のパスワードを確認
2. PostgreSQLのパスワードをリセット
3. パスワードに特殊文字が含まれる場合はURLエンコード

### エラー: "database does not exist"

**原因**: データベースが作成されていない

**解決方法:**
```bash
psql -U postgres
CREATE DATABASE creators_garden_dev;
\q
```

### エラー: "connection refused"

**原因**: PostgreSQLが起動していない

**解決方法:**
- Windows: サービスが起動しているか確認
- Mac: `brew services start postgresql`
- Linux: `sudo systemctl start postgresql`

## セキュリティ注意事項

- `.env.local`は`.gitignore`に含まれているため、Gitにはコミットされません
- 接続文字列には機密情報（パスワード）が含まれているため、絶対にGitにコミットしないでください
- 本番環境の接続文字列は使用しないでください

## よくある質問

### Q: パスワードを忘れた場合は？

A: PostgreSQLのパスワードをリセットするか、新しいユーザーを作成してください。

### Q: データベース名は変更できますか？

A: はい、任意の名前に変更できます。ただし、`CREATE DATABASE`コマンドで作成する必要があります。

### Q: ポート番号は変更できますか？

A: はい、PostgreSQLの設定でポートを変更した場合は、接続文字列のポート番号も変更してください。

### Q: ユーザー名は変更できますか？

A: はい、カスタムユーザーを作成して使用できます。


