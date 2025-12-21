# Neon DBへの切り替え手順

## 📋 現在の状況

Vercel上でPrisma DBを破棄してNeon DBに切り替えたとのことです。

## ✅ Neon DBの接続文字列の取得方法

### ステップ1: Neonダッシュボードで接続文字列を取得

1. **Neonダッシュボードにログイン**
   - https://console.neon.tech/

2. **プロジェクトを選択**
   - 該当するプロジェクトをクリック

3. **データベースを選択**
   - 使用しているデータベースをクリック

4. **「Connection Details」を開く**
   - データベースの詳細ページで「Connection Details」または「接続情報」をクリック

5. **接続文字列をコピー**
   - 「Connection String」または「接続文字列」を探す
   - 形式: `postgres://user:password@ep-xxx-xxx.region.aws.neon.tech/dbname?sslmode=require`
   - または: `postgres://user:password@ep-xxx-xxx.region.aws.neon.tech:5432/dbname?sslmode=require`

### ステップ2: Vercelで環境変数を設定

1. **Vercelダッシュボードで環境変数を開く**
   - プロジェクトの「Settings」→「Environment Variables」

2. **新しい環境変数を追加**
   - 「Add New」ボタンをクリック
   - **Name**: `POSTGRES_URL_NON_POOLING`
   - **Value**: ステップ1でコピーしたNeon DBの接続文字列
   - **Environment**: Production, Preview, Development（すべてに適用）
   - 「Save」をクリック

3. **既存の環境変数を削除または更新**
   - `POSTGRES_URL`がPrisma Accelerate（`db.prisma.io`）を指している場合、Neon DBの接続文字列に更新
   - `POSTGRES_PRISMA_URL`がPrisma Accelerateを指している場合、Neon DBの接続文字列に更新
   - `PRISMA_DATABASE_URL`が`prisma+postgres://`形式の場合、削除するか、Neon DBの接続文字列に更新

### ステップ3: 再デプロイ

環境変数を設定した後、自動的に再デプロイが開始されます。

## 🔍 Neon DBの接続文字列の形式

### 標準的な形式

```
postgres://user:password@ep-xxx-xxx.region.aws.neon.tech/dbname?sslmode=require
```

### ポート番号を含む形式

```
postgres://user:password@ep-xxx-xxx.region.aws.neon.tech:5432/dbname?sslmode=require
```

### パラメータの説明

- **`ep-xxx-xxx`**: Neon DBのエンドポイントID
- **`region`**: リージョン（例: `us-east-1`, `ap-northeast-1`）
- **`dbname`**: データベース名
- **`?sslmode=require`**: SSL接続を要求（Neon DBでは通常必要）

## ✅ コードの対応状況

現在のコード（`lib/db.ts`）は、既にNeon DBに対応しています：

1. **接続文字列の優先順位**
   - `POSTGRES_URL_NON_POOLING`を最優先で使用
   - Neon DBの接続文字列も標準的な`postgres://`形式なので、そのまま使用可能

2. **SSL設定**
   - Neon DB（`neon.tech`ドメイン）を検出すると、自動的にSSLを有効化
   - `sslmode=require`パラメータが接続文字列に含まれている場合も対応

3. **Prisma Accelerateのスキップ**
   - Prisma Accelerateエンドポイント（`db.prisma.io`）を自動的にスキップ
   - Neon DBの接続文字列は問題なく使用されます

## 🎯 確認方法

再デプロイ後、ログで以下を確認してください：

**成功している場合:**
```
✅ Using connection string from: POSTGRES_URL_NON_POOLING
✅ PostgreSQL Pool created successfully
```

**接続文字列のホスト名:**
```
Connection string host: ep-xxx-xxx.region.aws.neon.tech
```

## 📝 注意事項

1. **SSL接続**
   - Neon DBはSSL接続を要求します
   - 接続文字列に`?sslmode=require`が含まれていることを確認してください
   - コードは自動的にSSLを有効化します

2. **接続プーリング**
   - Neon DBは接続プーリングをサポートしています
   - `POSTGRES_URL_NON_POOLING`に直接接続文字列を設定すれば問題ありません

3. **データベーススキーマ**
   - Neon DBに切り替えた場合、既存のスキーマを移行する必要があります
   - `scripts/schema.sql`を実行してスキーマを作成してください

## 🎯 まとめ

1. **Neonダッシュボードで接続文字列を取得**
   - Connection Detailsから接続文字列をコピー

2. **Vercelで環境変数を設定**
   - `POSTGRES_URL_NON_POOLING`にNeon DBの接続文字列を設定

3. **既存の環境変数を更新**
   - Prisma Accelerateを指している環境変数を削除または更新

4. **再デプロイ**
   - 環境変数を設定すると自動的に再デプロイされます

これでNeon DBへの切り替えが完了します。

