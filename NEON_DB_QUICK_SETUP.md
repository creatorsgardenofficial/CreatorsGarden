# Neon DBへの切り替え - クイックセットアップ

## 🚨 現在のエラー

```
❌ All connection strings point to Prisma Accelerate endpoints
❌ ERROR: No valid connection string found!
POSTGRES_URL_NON_POOLING: false  ← これが設定されていない
```

## ✅ 解決手順（3ステップ）

### ステップ1: Neonダッシュボードで接続文字列を取得

1. **Neonダッシュボードにアクセス**
   - https://console.neon.tech/
   - ログイン

2. **プロジェクトを選択**
   - 左サイドバーからプロジェクトを選択

3. **データベースを選択**
   - プロジェクト内のデータベースをクリック

4. **「Connection Details」を開く**
   - データベースの詳細ページで「Connection Details」タブをクリック
   - または、「接続情報」ボタンをクリック

5. **接続文字列をコピー**
   - 「Connection String」または「接続文字列」を探す
   - **「Connection pooling」ではなく「Direct connection」を選択**
   - 形式: `postgres://user:password@ep-xxx-xxx.region.aws.neon.tech/dbname?sslmode=require`
   - この文字列をコピー

### ステップ2: Vercelで環境変数を設定

1. **Vercelダッシュボードにアクセス**
   - https://vercel.com/dashboard
   - ログイン

2. **プロジェクトを選択**
   - 該当するプロジェクト（CreatorsGarden）をクリック

3. **Settings → Environment Variables**
   - プロジェクトの「Settings」タブをクリック
   - 左サイドバーまたはページ内の「Environment Variables」をクリック

4. **新しい環境変数を追加**
   - 「Add New」ボタンをクリック
   - **Name**: `POSTGRES_URL_NON_POOLING`
   - **Value**: ステップ1でコピーしたNeon DBの接続文字列
   - **Environment**: 
     - ✅ Production
     - ✅ Preview  
     - ✅ Development
   - 「Save」をクリック

5. **既存の環境変数を確認・削除（オプション）**
   - `POSTGRES_PRISMA_URL`が`db.prisma.io`を指している場合、削除するか、Neon DBの接続文字列に更新
   - `PRISMA_DATABASE_URL`が`prisma+postgres://`形式の場合、削除

### ステップ3: 再デプロイ

環境変数を設定した後：
- **自動的に再デプロイが開始されます**（数分かかります）
- または、手動で「Deployments」タブから再デプロイをトリガー

## 🔍 確認方法

再デプロイ後、ログで以下を確認してください：

**成功している場合:**
```
✅ Using connection string from: POSTGRES_URL_NON_POOLING
✅ PostgreSQL Pool created successfully
Connection string host: ep-xxx-xxx.region.aws.neon.tech
```

**まだ問題がある場合:**
```
❌ ERROR: No valid connection string found!
POSTGRES_URL_NON_POOLING: false
```

## 📝 Neon DB接続文字列の形式

### 正しい形式（Direct Connection）

```
postgres://user:password@ep-xxx-xxx.region.aws.neon.tech/dbname?sslmode=require
```

### 注意点

- **`ep-xxx-xxx`**: Neon DBのエンドポイントID（例: `ep-cool-darkness-123456`）
- **`region`**: リージョン（例: `us-east-1`, `ap-northeast-1`）
- **`dbname`**: データベース名
- **`?sslmode=require`**: SSL接続を要求（通常含まれています）

### 間違った形式

- ❌ `prisma+postgres://...` - Prisma Accelerate形式（使用しない）
- ❌ `postgres://...@db.prisma.io:5432/...` - Prisma Accelerateエンドポイント（使用しない）

## 🎯 トラブルシューティング

### エラー: "POSTGRES_URL_NON_POOLING: false"

**原因:** 環境変数が設定されていない、または再デプロイされていない

**解決方法:**
1. Vercelダッシュボードで環境変数を再確認
2. 環境変数が正しく設定されているか確認（Production, Preview, Developmentすべて）
3. 再デプロイを確認（環境変数設定後、自動的に開始されます）

### エラー: "Connection refused" または "SSL required"

**原因:** 接続文字列が正しくない、またはSSL設定の問題

**解決方法:**
1. 接続文字列に`?sslmode=require`が含まれているか確認
2. Neonダッシュボードで「Direct Connection」を選択しているか確認
3. 接続文字列を再コピーして設定

### エラー: "All connection strings point to Prisma Accelerate endpoints"

**原因:** まだPrisma Accelerateエンドポイントを指している環境変数がある

**解決方法:**
1. Vercelダッシュボードで環境変数を確認
2. `db.prisma.io`を含む環境変数を削除または更新
3. `POSTGRES_URL_NON_POOLING`が正しく設定されているか確認

## 📋 チェックリスト

- [ ] Neonダッシュボードで接続文字列を取得
- [ ] 「Direct Connection」を選択（Connection poolingではない）
- [ ] Vercelダッシュボードで`POSTGRES_URL_NON_POOLING`を設定
- [ ] Production, Preview, Developmentすべてに設定
- [ ] 再デプロイが完了するまで待つ（数分）
- [ ] ログで「✅ Using connection string from: POSTGRES_URL_NON_POOLING」を確認

## 🎯 まとめ

1. **Neonダッシュボード** → Connection Details → Direct Connection文字列をコピー
2. **Vercelダッシュボード** → Settings → Environment Variables → `POSTGRES_URL_NON_POOLING`に設定
3. **再デプロイ** → 自動的に開始されます

これで問題は解決されます。

