# PostgreSQLのPATH設定方法

## 問題

`psql`コマンドが認識されない場合、PostgreSQLのbinディレクトリがPATH環境変数に追加されていない可能性があります。

## 解決方法

### 方法1: PostgreSQLのインストール場所を確認

通常、PostgreSQLは以下の場所にインストールされます：
- `C:\Program Files\PostgreSQL\[バージョン]\bin`
- 例: `C:\Program Files\PostgreSQL\15\bin`

### 方法2: PATH環境変数に追加

#### 手順1: システムのプロパティを開く

1. Windowsキー + R を押す
2. `sysdm.cpl`と入力してEnter
3. 「詳細設定」タブをクリック
4. 「環境変数」ボタンをクリック

#### 手順2: PATH環境変数を編集

1. 「システム環境変数」セクションで「Path」を選択
2. 「編集」ボタンをクリック
3. 「新規」ボタンをクリック
4. PostgreSQLのbinディレクトリのパスを追加：
   ```
   C:\Program Files\PostgreSQL\15\bin
   ```
   （バージョン番号は実際のインストールバージョンに合わせてください）
5. 「OK」をクリックしてすべてのダイアログを閉じる

#### 手順3: PowerShellを再起動

環境変数の変更を反映するために、PowerShellを再起動してください。

### 方法3: 一時的にPATHを設定（テスト用）

PowerShellで一時的にPATHを設定する場合：

```powershell
$env:Path += ";C:\Program Files\PostgreSQL\15\bin"
psql --version
```

（バージョン番号は実際のインストールバージョンに合わせてください）

### 方法4: フルパスで実行

PATHを設定する前に、フルパスで直接実行することもできます：

```powershell
& "C:\Program Files\PostgreSQL\15\bin\psql.exe" --version
```

## PostgreSQLがインストールされていない場合

### インストール手順

1. **PostgreSQLのダウンロード**
   - https://www.postgresql.org/download/windows/ にアクセス
   - 「Download the installer」をクリック
   - 最新バージョンをダウンロード

2. **インストール**
   - ダウンロードしたインストーラーを実行
   - インストール中に以下を設定：
     - **Port**: 5432（デフォルト）
     - **Superuser password**: 覚えやすいパスワードを設定（例: `postgres`）
     - **Locale**: デフォルトのまま

3. **インストールオプション**
   - 「Stack Builder」はスキップ可能（キャンセルしてOK）
   - 「コマンドラインツールをPATHに追加」にチェックを入れる（重要！）

4. **インストール完了後**
   - PowerShellを再起動
   - `psql --version`で確認

## 確認方法

### 1. PostgreSQLのインストール場所を確認

```powershell
Get-ChildItem "C:\Program Files\PostgreSQL" -Directory
```

### 2. psqlの存在を確認

```powershell
Test-Path "C:\Program Files\PostgreSQL\15\bin\psql.exe"
```

### 3. バージョン確認

```powershell
& "C:\Program Files\PostgreSQL\15\bin\psql.exe" --version
```

## よくある問題

### 問題1: 複数のバージョンがインストールされている

最新バージョンのbinディレクトリをPATHに追加してください。

### 問題2: インストール時にPATHに追加し忘れた

上記の「方法2」で手動でPATHに追加してください。

### 問題3: 32bit版と64bit版が混在

64bit版を使用することを推奨します。

## 次のステップ

PATHが設定されたら：

1. **PostgreSQLに接続**
   ```powershell
   psql -U postgres
   ```

2. **データベースを作成**
   ```sql
   CREATE DATABASE creators_garden_dev;
   \q
   ```

3. **.env.localを設定**
   ```env
   USE_DATABASE=true
   POSTGRES_URL=postgres://postgres:パスワード@localhost:5432/creators_garden_dev
   ```


