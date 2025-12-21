# PostgreSQLパスワードの確認と設定方法

## 「あなたのパスワード」とは？

`.env.local`の設定例で「あなたのパスワード」と書かれている部分は、**PostgreSQLをインストールした際に設定したパスワード**を指します。

## パスワードの確認方法

### 方法1: PostgreSQLに接続して確認（推奨）

以下のコマンドでPostgreSQLに接続を試みます：

```powershell
psql -U postgres
```

**実行結果:**
- パスワードを求められた場合 → そのパスワードが正しいパスワードです
- 接続できた場合 → パスワードなし、または既に認証済みです

**例:**
```
Password for user postgres: （ここでパスワードを入力）
```

### 方法2: よく使われるデフォルトパスワードを試す

PostgreSQLのインストール時にパスワードを設定しなかった場合、またはよく使われるデフォルトパスワード：

1. **`postgres`** （最も一般的）
2. **`admin`**
3. **`password`**
4. **`root`**
5. **空（パスワードなし）**

### 方法3: PostgreSQLの設定ファイルを確認

**Windows:**
- PostgreSQLのインストールフォルダ内の設定ファイルを確認
- 通常は `C:\Program Files\PostgreSQL\[バージョン]\data\pg_hba.conf`

**注意**: 設定ファイルにはパスワードは平文で保存されていません。

## 実際の設定例

### 例1: パスワードが`postgres`の場合

`.env.local`に以下のように設定：

```env
USE_DATABASE=true
POSTGRES_URL=postgres://postgres:postgres@localhost:5432/creators_garden_dev
```

**説明:**
- `postgres://` - プロトコル（変更不要）
- `postgres` - ユーザー名（最初の`postgres`）
- `postgres` - パスワード（2番目の`postgres`）← **ここが実際のパスワード**
- `@localhost:5432` - ホストとポート（変更不要）
- `/creators_garden_dev` - データベース名

### 例2: パスワードが`mypassword`の場合

```env
USE_DATABASE=true
POSTGRES_URL=postgres://postgres:mypassword@localhost:5432/creators_garden_dev
```

### 例3: パスワードが`admin123`の場合

```env
USE_DATABASE=true
POSTGRES_URL=postgres://postgres:admin123@localhost:5432/creators_garden_dev
```

### 例4: パスワードなしの場合（非推奨）

```env
USE_DATABASE=true
POSTGRES_URL=postgres://postgres@localhost:5432/creators_garden_dev
```

**注意**: パスワードなしはセキュリティ上推奨されません。

## パスワードが分からない場合の対処法

### オプション1: パスワードをリセット

PostgreSQLのパスワードをリセットして新しいパスワードを設定します。

**Windows:**
1. PostgreSQLのサービスを停止
2. `pg_hba.conf`を編集して認証方法を変更
3. PostgreSQLを再起動
4. パスワードなしで接続
5. 新しいパスワードを設定

### オプション2: 新しいユーザーを作成

既存のパスワードが分からない場合、新しいユーザーを作成できます（管理者権限が必要）。

```sql
CREATE USER dev_user WITH PASSWORD 'dev_password';
GRANT ALL PRIVILEGES ON DATABASE creators_garden_dev TO dev_user;
```

その後、`.env.local`を以下のように設定：

```env
USE_DATABASE=true
POSTGRES_URL=postgres://dev_user:dev_password@localhost:5432/creators_garden_dev
```

### オプション3: よく使われるパスワードを試す

まず、よく使われるパスワードを試してみてください：

1. `postgres`
2. `admin`
3. `password`
4. `root`

## ステップバイステップ手順

### ステップ1: パスワードを確認

```powershell
# PostgreSQLに接続を試みる
psql -U postgres
```

パスワードを求められたら、インストール時に設定したパスワードを入力してください。

### ステップ2: パスワードが分かったら、.env.localを設定

`.env.local`ファイルを開き、以下を追加または更新：

```env
USE_DATABASE=true
POSTGRES_URL=postgres://postgres:確認したパスワード@localhost:5432/creators_garden_dev
```

**例（パスワードが`postgres`の場合）:**
```env
USE_DATABASE=true
POSTGRES_URL=postgres://postgres:postgres@localhost:5432/creators_garden_dev
```

### ステップ3: 接続テスト

```bash
node scripts/setup-local-postgres.js
```

成功すると、以下のような出力が表示されます：
```
✅ PostgreSQL接続成功
   バージョン: PostgreSQL 15.0
```

## よくある質問

### Q: パスワードを入力しても接続できない

A: 以下の可能性があります：
1. パスワードが間違っている
2. PostgreSQLが起動していない
3. ユーザー名が間違っている

### Q: パスワードを忘れた

A: パスワードをリセットするか、新しいユーザーを作成してください。

### Q: パスワードなしで接続できる

A: その場合は、接続文字列からパスワード部分を省略できます：
```env
POSTGRES_URL=postgres://postgres@localhost:5432/creators_garden_dev
```

ただし、セキュリティ上、パスワードを設定することを推奨します。

### Q: パスワードに特殊文字が含まれる

A: URLエンコードが必要です。例：
- `@` → `%40`
- `#` → `%23`
- `%` → `%25`

## まとめ

1. **「あなたのパスワード」** = PostgreSQLインストール時に設定したパスワード
2. **確認方法**: `psql -U postgres`で接続を試す
3. **よく使われるパスワード**: `postgres`、`admin`、`password`など
4. **設定例**: `POSTGRES_URL=postgres://postgres:実際のパスワード@localhost:5432/creators_garden_dev`


