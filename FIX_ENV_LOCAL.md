# .env.local の修正方法

## 現在の問題

`.env.local`ファイルに以下の設定がありますが、パスワードが間違っています：

```env
POSTGRES_URL=postgres://postgres:password@localhost:5432/creators_garden_dev
```

実際のPostgreSQLのパスワードは`postgres`のようです。

## 修正方法

### ステップ1: .env.localファイルを開く

プロジェクトルートの`.env.local`ファイルを開いてください。

### ステップ2: パスワードを修正

以下の行を：

```env
POSTGRES_URL=postgres://postgres:password@localhost:5432/creators_garden_dev
```

以下のように変更：

```env
POSTGRES_URL=postgres://postgres:postgres@localhost:5432/creators_garden_dev
```

**変更点**: `password` → `postgres`

### ステップ3: ファイルを保存

変更を保存してください。

### ステップ4: スキーマを作成

```bash
npm run db:schema
```

## 完全な.env.localの内容

`.env.local`ファイルには以下の内容が含まれている必要があります：

```env
# データベースを使用する設定
USE_DATABASE=true

# ローカルPostgreSQL接続文字列
POSTGRES_URL=postgres://postgres:postgres@localhost:5432/creators_garden_dev
```

## 確認

修正後、以下のコマンドで接続テストができます：

```bash
node scripts/setup-local-postgres.js
```

成功すると、以下のような出力が表示されます：
```
✅ PostgreSQL接続成功
   バージョン: PostgreSQL 17.7
```

