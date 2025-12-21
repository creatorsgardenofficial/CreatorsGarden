# Vercel環境変数の設定手順

## 🚨 現在の問題

本番環境で以下のエラーが発生しています：

```
❌ All connection strings point to Prisma Accelerate endpoints
❌ ERROR: No valid connection string found!
```

**原因:**
- すべての環境変数がPrisma Accelerateエンドポイント（`db.prisma.io`）を指している
- `POSTGRES_URL_NON_POOLING`が設定されていない

## ✅ 解決方法

Vercelダッシュボードで環境変数を設定してください。

### ステップ1: Vercel Postgresの接続文字列を取得

1. **Vercelダッシュボードにログイン**
   - https://vercel.com/dashboard

2. **プロジェクトを選択**
   - 該当するプロジェクト（CreatorsGarden）をクリック

3. **Storageタブを開く**
   - 左サイドバーの「Storage」をクリック

4. **データベースを選択**
   - 使用しているPostgreSQLデータベースをクリック

5. **Settingsタブを開く**
   - データベースの「Settings」タブをクリック

6. **「Direct Connection」文字列をコピー**
   - 「Connection String」セクションの「Direct Connection」を探す
   - 形式: `postgres://user:pass@aws-0-*.pooler.supabase.com:5432/db`
   - この文字列をコピー

### ステップ2: 環境変数を設定

1. **Vercelダッシュボードで環境変数を開く**
   - プロジェクトの「Settings」→「Environment Variables」

2. **新しい環境変数を追加**
   - 「Add New」ボタンをクリック
   - **Name**: `POSTGRES_URL_NON_POOLING`
   - **Value**: ステップ1でコピーした「Direct Connection」文字列
   - **Environment**: 
     - ✅ Production
     - ✅ Preview
     - ✅ Development
   - 「Save」をクリック

3. **既存の環境変数を確認（オプション）**
   - `POSTGRES_URL`と`POSTGRES_PRISMA_URL`が`db.prisma.io`を指している場合、これらも更新することを推奨
   - ただし、`POSTGRES_URL_NON_POOLING`が設定されていれば、コードは自動的にそれを優先使用します

### ステップ3: 再デプロイ

環境変数を設定した後、自動的に再デプロイが開始されます。または、手動で再デプロイをトリガーしてください。

## 🔍 確認方法

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

## 📝 注意事項

- **接続文字列には機密情報が含まれます**
  - ユーザー名、パスワード、データベース名が含まれます
  - 公開リポジトリにコミットしないでください
  - Vercelの環境変数として安全に管理されています

- **環境ごとに異なる接続文字列を使用**
  - Production、Preview、Developmentで異なるデータベースを使用することを推奨
  - 環境変数で環境ごとに設定できます

## 🎯 まとめ

1. Vercelダッシュボード → Storage → Your Database → Settings
2. 「Direct Connection」文字列をコピー
3. Settings → Environment Variables → 新規追加
4. `POSTGRES_URL_NON_POOLING`に「Direct Connection」文字列を設定
5. 再デプロイ

これで問題は解決されます。

