# POSTGRES_URLの取得方法

## ローカルのPostgreSQLを使用する場合

### 1. PostgreSQLのインストール確認

まず、PostgreSQLがインストールされているか確認します：

```bash
# PostgreSQLのバージョンを確認
psql --version
```

インストールされていない場合：
- **Windows**: https://www.postgresql.org/download/windows/ からインストーラーをダウンロード
- **Mac**: `brew install postgresql`
- **Linux**: `sudo apt-get install postgresql`

### 2. PostgreSQLの起動確認

PostgreSQLが起動しているか確認します：

**Windows:**
- サービスとして自動起動される場合が多い
- サービス一覧で「postgresql-x64-XX」を確認

**Mac:**
```bash
brew services start postgresql
```

**Linux:**
```bash
sudo systemctl start postgresql
sudo systemctl status postgresql
```

### 3. データベースの作成

PostgreSQLに接続して、開発用データベースを作成します：

```bash
# PostgreSQLに接続（デフォルトのpostgresユーザーで）
psql -U postgres
```

接続後、以下のSQLを実行：

```sql
-- 開発用データベースを作成
CREATE DATABASE creators_garden_dev;

-- 開発用ユーザーを作成（オプション、推奨）
CREATE USER dev_user WITH PASSWORD 'dev_password';

-- データベースへの権限を付与
GRANT ALL PRIVILEGES ON DATABASE creators_garden_dev TO dev_user;

-- 終了
\q
```

### 4. 接続文字列の構築

接続文字列は以下の形式です：

```
postgres://[ユーザー名]:[パスワード]@[ホスト]:[ポート]/[データベース名]
```

**例：**

#### デフォルトのpostgresユーザーを使用する場合：
```env
POSTGRES_URL=postgres://postgres:your_password@localhost:5432/creators_garden_dev
```

#### 開発用ユーザー（dev_user）を作成した場合：
```env
POSTGRES_URL=postgres://dev_user:dev_password@localhost:5432/creators_garden_dev
```

### 5. パスワードの確認方法

PostgreSQLのパスワードを忘れた場合：

**Windows:**
1. PostgreSQLのインストールディレクトリを確認（通常は `C:\Program Files\PostgreSQL\XX\data`）
2. `pg_hba.conf`ファイルを開く
3. 認証方法を確認

または、PostgreSQLのインストール時に設定したパスワードを使用します。

**Mac/Linux:**
```bash
# postgresユーザーで接続（パスワード不要の場合）
sudo -u postgres psql

# パスワードを変更
ALTER USER postgres WITH PASSWORD 'new_password';
```

### 6. .env.localへの設定

`.env.local`ファイルに以下を追加：

```env
USE_DATABASE=true
POSTGRES_URL=postgres://dev_user:dev_password@localhost:5432/creators_garden_dev
```

**重要**: 
- `your_password`や`dev_password`を実際のパスワードに置き換えてください
- パスワードに特殊文字が含まれる場合は、URLエンコードが必要な場合があります

## 接続テスト

設定後、以下のコマンドで接続をテストできます：

```bash
# PostgreSQLに接続してテスト
psql -U dev_user -d creators_garden_dev -h localhost
```

接続できれば成功です。

## トラブルシューティング

### エラー: "password authentication failed"

- パスワードが正しいか確認
- ユーザー名が正しいか確認
- `pg_hba.conf`の認証設定を確認

### エラー: "database does not exist"

- データベースが作成されているか確認
- データベース名が正しいか確認

### エラー: "connection refused"

- PostgreSQLが起動しているか確認
- ポート5432が正しいか確認
- ファイアウォールでポートがブロックされていないか確認






