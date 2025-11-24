# Stripe CLI クイックインストール（Windows）

wingetで見つからない場合の手動インストール手順です。

## ステップ1: Stripe CLIをダウンロード

1. ブラウザで以下を開く：
   https://github.com/stripe/stripe-cli/releases/latest

2. 最新のリリースから `stripe_X.X.X_windows_x86_64.zip` をダウンロード
   （例: `stripe_1.21.5_windows_x86_64.zip`）

## ステップ2: 解凍と配置

### オプションA: ユーザーフォルダに配置（推奨・簡単）

1. ダウンロードしたZIPファイルを解凍
2. `stripe.exe` ファイルを `C:\Users\<あなたのユーザー名>\bin\` に移動
   - フォルダがなければ作成してください

### オプションB: Program Filesに配置

1. ダウンロードしたZIPファイルを解凍
2. `C:\Program Files\Stripe\` フォルダを作成
3. `stripe.exe` ファイルをそこに移動

## ステップ3: PATHに追加（PowerShellで実行）

### オプションAを使用した場合：

```powershell
# 現在のユーザーのPATHに追加
[Environment]::SetEnvironmentVariable("Path", $env:Path + ";$env:USERPROFILE\bin", "User")
```

### オプションBを使用した場合：

```powershell
# 管理者権限で実行する必要があります
# PowerShellを「管理者として実行」してから以下を実行：
[Environment]::SetEnvironmentVariable("Path", $env:Path + ";C:\Program Files\Stripe", "Machine")
```

## ステップ4: PowerShellを再起動

**重要**: 環境変数の変更を反映するため、PowerShellを完全に閉じて新しいウィンドウを開いてください。

## ステップ5: 動作確認

新しいPowerShellで：

```powershell
stripe --version
```

バージョン番号が表示されれば成功です！

## ステップ6: ログイン

```powershell
stripe login
```

ブラウザが開くので、Stripeアカウントで認証してください。

## ステップ7: Webhookを転送

開発サーバーが起動している状態で：

```powershell
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

---

## トラブルシューティング

### まだ「認識されません」と表示される場合

1. **PowerShellを完全に再起動**（すべてのウィンドウを閉じる）

2. **PATHを確認**：
   ```powershell
   $env:Path -split ';' | Where-Object { $_ -like "*stripe*" -or $_ -like "*bin*" }
   ```

3. **一時的にPATHを追加**（現在のセッションのみ）：
   ```powershell
   # オプションAを使用した場合
   $env:Path += ";$env:USERPROFILE\bin"
   
   # または、オプションBを使用した場合
   $env:Path += ";C:\Program Files\Stripe"
   ```

4. **完全なパスで実行**：
   ```powershell
   # オプションAを使用した場合
   & "$env:USERPROFILE\bin\stripe.exe" --version
   
   # または、オプションBを使用した場合
   & "C:\Program Files\Stripe\stripe.exe" --version
   ```

### アクセスが拒否された場合

- `C:\Program Files\Stripe\` に配置する場合は、管理者権限が必要です
- 代わりに `C:\Users\<ユーザー名>\bin\` を使用することを推奨します

