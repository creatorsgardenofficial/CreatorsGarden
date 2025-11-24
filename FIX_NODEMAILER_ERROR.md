# nodemailerエラーの解決方法

## ✅ パッケージはインストール済み

`package.json`と`package-lock.json`を確認したところ、`nodemailer`は正しく追加されています。

## 🔧 解決手順

### 1. 開発サーバーを停止

現在実行中の開発サーバーを停止してください：
- ターミナルで `Ctrl + C` を押す

### 2. Next.jsのキャッシュをクリア

`.next`フォルダを削除してください：

**PowerShellの場合**:
```powershell
Remove-Item -Recurse -Force .next
```

**エクスプローラーで削除する場合**:
1. `C:\Users\yamada\Documents\creator-collab\.next` フォルダを開く
2. フォルダを削除

### 3. 開発サーバーを再起動

```bash
npm run dev
```

## 🔍 それでもエラーが出る場合

### 方法1: node_modulesを再インストール

```bash
# node_modulesフォルダを削除
Remove-Item -Recurse -Force node_modules

# package-lock.jsonを削除（オプション）
Remove-Item package-lock.json

# 再インストール
npm install
```

### 方法2: パッケージを明示的に再インストール

```bash
npm uninstall nodemailer @types/nodemailer
npm install nodemailer @types/nodemailer
```

## ✅ 確認方法

インストールが成功したか確認：

```bash
npm list nodemailer
```

`nodemailer@6.9.8` が表示されればOKです。

## 📝 現在の状態

- ✅ `package.json`に`nodemailer`が追加済み
- ✅ `package-lock.json`に`nodemailer`が追加済み
- ✅ `npm install`が完了（81個のパッケージが追加）

**次のステップ**: 開発サーバーを再起動してください。

