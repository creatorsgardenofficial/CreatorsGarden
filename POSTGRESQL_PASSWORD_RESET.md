# PostgreSQLのパスワード確認・リセット方法

## パスワードが分からない場合の対処法

### 方法1: よく使われるデフォルトパスワードを試す

PostgreSQLインストール時に設定したパスワードとして、よく使われるもの：

1. **`postgres`** （最も一般的）
2. **`admin`**
3. **`password`**
4. **`root`**
5. **空（パスワードなし）**

まずは`postgres`を試してみてください。

### 方法2: パスワードなしで接続できるか確認

PostgreSQLの設定によっては、パスワードなしで接続できる場合があります：

```powershell
psql -U postgres
```

パスワードを求められない場合は、パスワードなしで接続できます。

### 方法3: pg_hba.confを編集してパスワードなしで接続（一時的）

パスワードを忘れた場合、一時的に認証方法を変更してパスワードなしで接続できます。

#### 手順

1. **PostgreSQLのサービスを停止**
   ```powershell
   # サービス名を確認
   Get-Service -Name postgresql*
   
   # サービスを停止（サービス名は実際のものに置き換え）
   Stop-Service -Name postgresql-x64-15
   ```

2. **pg_hba.confファイルを編集**
   
   ファイルの場所（通常）:
   ```
   C:\Program Files\PostgreSQL\15\data\pg_hba.conf
   ```
   
   ファイルをメモ帳で開き、以下の行を探します：
   ```
   # IPv4 local connections:
   host    all             all             127.0.0.1/32            scram-sha-256
   ```
   
   これを以下のように変更：
   ```
   # IPv4 local connections:
   host    all             all             127.0.0.1/32            trust
   ```
   
   **重要**: `scram-sha-256`を`trust`に変更します。

3. **PostgreSQLのサービスを再起動**
   ```powershell
   Start-Service -Name postgresql-x64-15
   ```

4. **パスワードなしで接続**
   ```powershell
   psql -U postgres
   ```

5. **新しいパスワードを設定**
   ```sql
   ALTER USER postgres WITH PASSWORD '新しいパスワード';
   ```

6. **pg_hba.confを元に戻す**
   
   `trust`を`scram-sha-256`に戻します。

7. **PostgreSQLのサービスを再起動**
   ```powershell
   Restart-Service -Name postgresql-x64-15
   ```

### 方法4: Windowsのサービスアカウントで接続

PostgreSQLがWindowsのサービスアカウントで実行されている場合、認証なしで接続できる場合があります。

```powershell
# PostgreSQLのサービスアカウントを確認
Get-WmiObject Win32_Service | Where-Object {$_.Name -like "postgresql*"} | Select-Object Name, StartName
```

## 推奨: まずはよく使われるパスワードを試す

最も簡単な方法は、よく使われるパスワードを試すことです：

### ステップ1: パスワード`postgres`を試す

```powershell
psql -U postgres
```

パスワードを求められたら、`postgres`と入力してください。

### ステップ2: 接続できたら、.env.localを設定

接続できたら、`.env.local`に以下を設定：

```env
USE_DATABASE=true
POSTGRES_URL=postgres://postgres:postgres@localhost:5432/creators_garden_dev
```

### ステップ3: 接続できない場合

他のよく使われるパスワードを試すか、上記の「方法3」でパスワードをリセットしてください。

## パスワードをリセットした後の手順

1. **データベースを作成**
   ```sql
   CREATE DATABASE creators_garden_dev;
   \q
   ```

2. **.env.localを設定**
   ```env
   USE_DATABASE=true
   POSTGRES_URL=postgres://postgres:新しいパスワード@localhost:5432/creators_garden_dev
   ```

3. **接続テスト**
   ```bash
   node scripts/setup-local-postgres.js
   ```

## セキュリティ注意事項

- パスワードをリセットした後は、必ず`pg_hba.conf`を元の設定（`scram-sha-256`）に戻してください
- 本番環境では、強力なパスワードを使用してください
- パスワードは`.env.local`に保存されますが、Gitにはコミットしないでください

## トラブルシューティング

### エラー: "サービスが見つからない"

PostgreSQLのサービス名を確認：
```powershell
Get-Service -Name postgresql*
```

### エラー: "pg_hba.confが見つからない"

PostgreSQLのデータディレクトリを確認：
```powershell
Get-ChildItem "C:\Program Files\PostgreSQL" -Recurse -Filter "pg_hba.conf"
```

### エラー: "権限が不足しています"

管理者権限でPowerShellを実行してください。

