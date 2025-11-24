# Stripe CLI Windows インストールガイド

WindowsでStripe CLIをインストールする方法を説明します。

## 方法1: wingetを使用（推奨・最も簡単）

Windows 10/11でwingetが利用可能な場合：

```powershell
winget install stripe.stripe-cli
```

インストール後、PowerShellを再起動してください。

## 方法2: Scoopを使用

Scoopがインストールされている場合：

```powershell
scoop install stripe
```

## 方法3: Chocolateyを使用

Chocolateyがインストールされている場合：

```powershell
choco install stripe-cli
```

## 方法4: 手動インストール

### ステップ1: 最新版をダウンロード

1. [Stripe CLI リリースページ](https://github.com/stripe/stripe-cli/releases) にアクセス
2. 最新の `stripe_X.X.X_windows_x86_64.zip` をダウンロード

### ステップ2: 解凍

1. ダウンロードしたZIPファイルを解凍
2. `stripe.exe` ファイルを確認

### ステップ3: PATHに追加

#### オプションA: システム全体にインストール

1. `stripe.exe` を `C:\Program Files\Stripe\` に移動（フォルダを作成）
2. 環境変数に追加：
   - 「システムのプロパティ」→「環境変数」を開く
   - 「システム環境変数」の「Path」を選択して「編集」
   - 「新規」をクリックして `C:\Program Files\Stripe` を追加
   - 「OK」をクリック

#### オプションB: ユーザー専用にインストール

1. `stripe.exe` を `C:\Users\<ユーザー名>\bin\` に移動（フォルダを作成）
2. 環境変数に追加：
   - 「システムのプロパティ」→「環境変数」を開く
   - 「ユーザー環境変数」の「Path」を選択して「編集」
   - 「新規」をクリックして `C:\Users\<ユーザー名>\bin` を追加
   - 「OK」をクリック

### ステップ4: PowerShellを再起動

環境変数の変更を反映するため、PowerShellを完全に閉じて再起動してください。

## インストール確認

PowerShellで以下を実行して、インストールが成功したか確認：

```powershell
stripe --version
```

正常にインストールされていれば、バージョン番号が表示されます。

例：
```
stripe version 1.21.5
```

## ログイン

インストール後、Stripeアカウントにログイン：

```powershell
stripe login
```

ブラウザが開き、Stripeアカウントへのアクセス許可を求められます。
「Allow access」をクリックして認証を完了してください。

## トラブルシューティング

### エラー: "stripe は認識されません"

**原因**: PATHに追加されていない、またはPowerShellを再起動していない

**解決方法**:
1. PowerShellを完全に閉じて再起動
2. 環境変数の設定を確認
3. 以下のコマンドでPATHを確認：
   ```powershell
   $env:Path -split ';' | Select-String -Pattern "stripe"
   ```

### エラー: "winget は認識されません"

**原因**: Windows 10の古いバージョンを使用している、またはwingetがインストールされていない

**解決方法**:
- 方法4（手動インストール）を使用してください
- または、[App Installer](https://www.microsoft.com/store/productId/9NBLGGH4NNS1) をインストール

### エラー: "アクセスが拒否されました"

**原因**: 管理者権限が必要

**解決方法**:
1. PowerShellを管理者として実行（右クリック→「管理者として実行」）
2. インストールコマンドを再実行

### インストール後もコマンドが認識されない場合

1. **PowerShellを完全に再起動**
   - すべてのPowerShellウィンドウを閉じる
   - 新しいPowerShellを開く

2. **環境変数を確認**
   ```powershell
   # 現在のPATHを確認
   $env:Path
   
   # Stripeのパスが含まれているか確認
   $env:Path -split ';' | Where-Object { $_ -like "*stripe*" }
   ```

3. **手動でPATHを追加（一時的）**
   ```powershell
   # 現在のセッションのみ有効
   $env:Path += ";C:\Program Files\Stripe"
   ```

4. **完全なパスで実行**
   ```powershell
   # インストール場所が分かっている場合
   & "C:\Program Files\Stripe\stripe.exe" --version
   ```

## 次のステップ

インストールとログインが完了したら、以下を実行：

```powershell
# Webhookを転送（開発サーバーが起動している状態で）
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

詳細は `STRIPE_WEBHOOK_SETUP.md` を参照してください。

