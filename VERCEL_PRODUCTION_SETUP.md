# 本番環境（Vercel）でのデータベース設定ガイド

## 現在の状況

- **ローカル環境**: `.env.local`に`POSTGRES_URL`を設定してデータベースに接続
- **本番環境**: Vercelダッシュボードで環境変数を設定する必要があります

## 本番環境での設定方法

### 方法1: 同じデータベースを使用する（推奨・開発・本番で同じDB）

**メリット**: 
- 設定が簡単
- 開発と本番で同じデータを共有できる

**デメリット**:
- 開発中のデータが本番に影響する可能性がある

**手順**:

1. **Vercelダッシュボードで環境変数を設定**
   - プロジェクトの「Settings」→「Environment Variables」
   - 以下の環境変数を追加：
     ```
     POSTGRES_URL=postgres://8711f222b0ee2a759b50588c4083a2a9d0edcd802bc19d4e05ec0d12ad8e6c1d:sk_zcsxrUxlHws1ygDAdtgj6@db.prisma.io:5432/postgres?sslmode=require
     ```
   - **Environment**: `Production`, `Preview`, `Development`すべてにチェック
   - 「Save」をクリック

2. **デプロイ**
   - 環境変数を設定後、自動的に再デプロイされるか、手動で再デプロイ

### 方法2: 別のデータベースを作成する（推奨・本番用に専用DB）

**メリット**:
- 開発と本番のデータが分離される
- 本番データが安全

**デメリット**:
- データベースを2つ管理する必要がある

**手順**:

1. **本番用データベースを作成**
   - Vercelダッシュボード → Storage → Create Database
   - 「Prisma Postgres」を選択
   - データベース名: `creators-garden-prod`（例）
   - リージョンを選択
   - 作成

2. **本番用データベースのスキーマを作成**
   - 作成したデータベースの環境変数をコピー
   - ローカルで環境変数を設定：
     ```powershell
     $env:POSTGRES_URL="postgres://..." # 本番用のURL
     ```
   - スキーマを実行：
     ```bash
     npm run db:schema
     ```

3. **Vercelダッシュボードで環境変数を設定**
   - プロジェクトの「Settings」→「Environment Variables」
   - `POSTGRES_URL`を追加（本番用データベースのURL）
   - **Environment**: `Production`のみにチェック
   - 「Save」をクリック

4. **開発環境用の環境変数も設定（オプション）**
   - 同じページで、`POSTGRES_URL`を追加（開発用データベースのURL）
   - **Environment**: `Development`, `Preview`にチェック
   - 「Save」をクリック

## 環境変数の自動設定について

**Prisma Postgresを作成した場合**:
- Vercelダッシュボードでデータベースを作成すると、**自動的に環境変数が設定されます**
- ただし、プロジェクトに**リンク**されている必要があります

**確認方法**:
1. Vercelダッシュボード → プロジェクト → Settings → Environment Variables
2. 以下の環境変数が表示されていればOK：
   - `POSTGRES_URL`
   - `POSTGRES_PRISMA_URL`
   - `POSTGRES_URL_NON_POOLING`

## アプリケーションの動作

### 自動判定ロジック

`lib/db.ts`の`shouldUseDatabase()`関数が以下をチェック：

```typescript
export function shouldUseDatabase(): boolean {
  if (isDatabaseAvailable()) {
    // 開発環境でもデータベースを使用する場合は、環境変数で制御
    return process.env.USE_DATABASE === 'true' || process.env.VERCEL === '1';
  }
  return false;
}
```

**動作**:
- **ローカル環境**: `USE_DATABASE=true`が設定されている場合のみデータベースを使用
- **本番環境（Vercel）**: `process.env.VERCEL === '1'`が自動的に設定されるため、環境変数があれば自動的にデータベースを使用

### 環境変数の優先順位

1. `POSTGRES_URL`（最優先）
2. `POSTGRES_PRISMA_URL`
3. `POSTGRES_URL_NON_POOLING`

## 確認方法

### 1. 環境変数が設定されているか確認

Vercelダッシュボードで：
- Settings → Environment Variables
- `POSTGRES_URL`が表示されているか確認

### 2. 本番環境で動作確認

1. **デプロイ後、ログを確認**
   - Vercelダッシュボード → Deployments → 最新のデプロイメント → Logs
   - データベース接続エラーがないか確認

2. **新規登録をテスト**
   - 本番環境のURLにアクセス
   - `/register`で新規登録を試す
   - エラーが発生しないか確認

## トラブルシューティング

### エラー: "File system is read-only"

**原因**: 環境変数が設定されていない、またはデータベース接続に失敗している

**解決方法**:
1. Vercelダッシュボードで環境変数を確認
2. データベースがプロジェクトにリンクされているか確認
3. 環境変数が正しいEnvironment（Production）に設定されているか確認

### エラー: "Database connection failed"

**原因**: データベースURLが間違っている、またはデータベースが存在しない

**解決方法**:
1. 環境変数の値を確認
2. データベースが作成されているか確認
3. データベースがプロジェクトにリンクされているか確認

## 推奨設定

### 開発環境
```env
# .env.local
POSTGRES_URL=postgres://... # 開発用データベース
USE_DATABASE=true  # 開発環境でもデータベースを使用
```

### 本番環境
- Vercelダッシュボードで環境変数を設定
- `POSTGRES_URL`をProduction環境に設定
- データベースは自動的にリンクされる

## 次のステップ

1. ✅ データベースの作成（完了）
2. ✅ スキーマの実行（完了）
3. ⏳ Vercelダッシュボードで環境変数の確認
4. ⏳ 本番環境での動作確認

