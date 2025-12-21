# Vercel Postgres環境変数の設定手順（Prisma Accelerateを使わない場合）

## 📋 現在の状況

このプロジェクトは**Prismaを使っていません**（`pg`ライブラリを直接使用）。

そのため、Vercel Postgresの環境変数を正しく設定するだけで解決します。

## ✅ 推奨される環境変数の設定

### Vercelダッシュボードで設定すべき環境変数

1. **`POSTGRES_URL_NON_POOLING`** （最優先、必須）
   - Vercel Postgresの「Direct Connection」文字列
   - 形式: `postgres://user:pass@aws-0-*.pooler.supabase.com:5432/db`
   - ポート番号: `5432`

2. **`POSTGRES_PRISMA_URL`** （オプション、推奨）
   - Vercel Postgresの「Pooled Connection」文字列
   - 形式: `postgres://user:pass@aws-0-*.pooler.supabase.com:6543/db?pgbouncer=true`
   - ポート番号: `6543`

3. **`POSTGRES_URL`** （オプション）
   - Vercel Postgresの「Direct Connection」文字列（`POSTGRES_URL_NON_POOLING`と同じ）

### 削除または更新すべき環境変数

以下の環境変数がPrisma Accelerateエンドポイント（`db.prisma.io`）を指している場合：

- **`PRISMA_DATABASE_URL`** - 削除するか、Vercel Postgresの接続文字列に更新
- **`POSTGRES_URL`** - Vercel Postgresの接続文字列に更新
- **`POSTGRES_PRISMA_URL`** - Vercel Postgresの接続文字列に更新

## 🔍 接続文字列の取得方法

### 方法1: Vercelダッシュボードから取得（推奨）

1. **Vercelダッシュボードにログイン**
   - https://vercel.com/dashboard

2. **プロジェクトを選択**
   - 該当するプロジェクトをクリック

3. **Storageタブを開く**
   - 左サイドバーの「Storage」をクリック

4. **データベースを選択**
   - 使用しているPostgreSQLデータベースをクリック

5. **接続文字列を確認**
   - データベースの詳細ページに接続文字列が表示される
   - または、「Settings」タブ → 「Connection String」セクション
   - または、「Overview」タブに接続情報が表示される

6. **接続文字列をコピー**
   - **Direct Connection**（ポート5432）: `POSTGRES_URL_NON_POOLING`に設定
   - **Pooled Connection**（ポート6543）: `POSTGRES_PRISMA_URL`に設定（オプション）

### 方法2: 環境変数ページから確認

1. **プロジェクトのSettings → Environment Variables**
   - 既存の環境変数を確認
   - `POSTGRES_URL`や`POSTGRES_PRISMA_URL`が既に設定されている場合、その値を確認
   - ただし、`db.prisma.io`を含む場合は使用しない

## 🎯 設定手順

### ステップ1: 環境変数を開く

1. Vercelダッシュボード → プロジェクト → Settings → Environment Variables

### ステップ2: 新しい環境変数を追加

1. **`POSTGRES_URL_NON_POOLING`を追加**
   - 「Add New」ボタンをクリック
   - **Name**: `POSTGRES_URL_NON_POOLING`
   - **Value**: Vercel Postgresの「Direct Connection」文字列
   - **Environment**: Production, Preview, Development（すべて）
   - 「Save」をクリック

2. **既存の環境変数を更新（必要に応じて）**
   - `POSTGRES_URL`が`db.prisma.io`を指している場合、Vercel Postgresの接続文字列に更新
   - `POSTGRES_PRISMA_URL`が`db.prisma.io`を指している場合、Vercel Postgresの接続文字列に更新
   - `PRISMA_DATABASE_URL`が`prisma+postgres://`形式の場合、削除するか、Vercel Postgresの接続文字列に更新

### ステップ3: 再デプロイ

環境変数を設定した後、自動的に再デプロイが開始されます。

## 📊 コードの動作

現在のコード（`lib/db.ts`）は、以下の優先順位で接続文字列を探します：

```
1. POSTGRES_URL_NON_POOLING  ← 最優先（ここに設定すればOK）
2. STORAGE_URL
3. STORAGE_PRISMA_URL
4. POSTGRES_URL
5. POSTGRES_PRISMA_URL
```

**重要な動作:**
- Prisma Accelerateエンドポイント（`db.prisma.io`）を検出すると、自動的にスキップ
- `POSTGRES_URL_NON_POOLING`が設定されていれば、それを最優先で使用

## ✅ 確認方法

再デプロイ後、ログで以下を確認してください：

**成功している場合:**
```
✅ Using connection string from: POSTGRES_URL_NON_POOLING
✅ PostgreSQL Pool created successfully
```

**まだ問題がある場合:**
```
❌ All connection strings point to Prisma Accelerate endpoints
❌ ERROR: No valid connection string found!
```

## 🎯 まとめ

1. **`POSTGRES_URL_NON_POOLING`を設定**（必須）
   - Vercel Postgresの「Direct Connection」文字列
   - これが設定されれば、コードは自動的にそれを使用します

2. **既存の環境変数を確認**
   - `db.prisma.io`を指している環境変数は削除または更新

3. **再デプロイ**
   - 環境変数を設定すると自動的に再デプロイされます

これで問題は解決されます。

