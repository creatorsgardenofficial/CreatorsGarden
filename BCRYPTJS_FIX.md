# bcryptjs モジュール解決エラーの修正

## 問題

`Module not found: Can't resolve 'bcryptjs'` エラーが発生しています。

## 解決方法

### 方法1: 依存関係の再インストール（推奨）

ターミナルで以下のコマンドを実行してください：

```bash
cd creator-collab
npm install
```

### 方法2: bcryptjsのみを再インストール

```bash
cd creator-collab
npm install bcryptjs @types/bcryptjs
```

### 方法3: node_modulesのクリーンインストール

依存関係の問題が続く場合：

```bash
cd creator-collab
rm -rf node_modules package-lock.json
npm install
```

（Windowsの場合：`rmdir /s /q node_modules` と `del package-lock.json`）

## インポート方法の変更

`lib/password.ts`のインポート方法を変更しました：

```typescript
// 変更前
import bcrypt from 'bcryptjs';

// 変更後
import * as bcrypt from 'bcryptjs';
```

これにより、CommonJSモジュールとして正しくインポートされます。

## 確認

インストール後、以下で確認できます：

```bash
npm list bcryptjs
```

`bcryptjs@2.4.3`が表示されれば、インストールは成功しています。

## サーバーの再起動

インストール後、サーバーを再起動してください：

```bash
npm run dev
```

