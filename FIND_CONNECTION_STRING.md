# Vercel Postgres「Connection String」の見つけ方

## 🔍 現在の状況

Settingsページには「Connection String」セクションが表示されていないようです。

## 📋 確認すべき場所

### 方法1: Settingsページ内の他のセクションを確認

現在表示されているSettingsページで、以下を確認してください：

1. **ページを下にスクロール**
   - 「Connection String」セクションが下の方にある可能性があります
   - 「Update Configuration」セクションの下を確認

2. **「Connection String」または「Connection」セクションを探す**
   - セクション名は「Connection String」「Connection」「Database Connection」など

### 方法2: 別のタブを確認

Vercel Postgresの設定ページには、通常複数のタブがあります：

1. **「Overview」タブ**
   - 左サイドバーまたはページ上部のタブで「Overview」をクリック
   - 「Connection String」がここにある可能性があります

2. **「Connection」タブ**
   - もし「Connection」というタブがあれば、そこを確認

3. **「Database」タブ**
   - データベース情報と一緒に接続文字列が表示される可能性があります

### 方法3: Storageページから直接確認

1. **Storageページに戻る**
   - 左サイドバーの「Storage」をクリック
   - または、プロジェクトの「Storage」タブを開く

2. **データベースカードを確認**
   - データベースのカード（ボックス）に接続文字列が表示されている可能性があります
   - 「Connection String」や「Copy Connection String」ボタンを探す

3. **データベースをクリック**
   - データベース名をクリックして詳細ページを開く
   - 詳細ページに「Connection String」セクションがある可能性があります

### 方法4: 環境変数ページから確認

1. **プロジェクトのSettings → Environment Variables**
   - プロジェクトの「Settings」タブを開く
   - 「Environment Variables」を選択

2. **既存の環境変数を確認**
   - `POSTGRES_URL`や`POSTGRES_PRISMA_URL`が既に設定されている場合、その値を確認
   - ただし、これらがPrisma Accelerateを指している場合は使用しない

3. **Vercel Postgresの接続文字列を探す**
   - 環境変数ページに「Connection String」へのリンクがある可能性があります

## 🎯 推奨される手順

1. **Settingsページを下にスクロール**
   - 「Connection String」セクションが下の方にある可能性が高いです

2. **「Overview」タブを確認**
   - 左サイドバーまたはページ上部のタブで「Overview」をクリック
   - データベースの概要情報と一緒に接続文字列が表示されることが多いです

3. **Storageページから確認**
   - プロジェクトの「Storage」タブに戻る
   - データベースカードに接続情報が表示されている可能性があります

## 📝 接続文字列の形式

見つかった接続文字列は、以下のような形式です：

**Direct Connection（推奨）:**
```
postgres://user:password@aws-0-xxxxx.pooler.supabase.com:5432/dbname
```

**Pooled Connection:**
```
postgres://user:password@aws-0-xxxxx.pooler.supabase.com:6543/dbname?pgbouncer=true
```

**注意:**
- `POSTGRES_URL_NON_POOLING`には「Direct Connection」を使用してください
- ポート番号が`5432`のものが「Direct Connection」です
- ポート番号が`6543`のものは「Pooled Connection」です

## 🔍 見つからない場合

もし「Connection String」セクションが見つからない場合：

1. **Vercelのドキュメントを確認**
   - https://vercel.com/docs/storage/vercel-postgres

2. **Vercelサポートに問い合わせ**
   - サポートページから問い合わせる

3. **既存の環境変数を確認**
   - `POSTGRES_URL`が設定されている場合、その値がVercel Postgresの接続文字列である可能性があります
   - ただし、`db.prisma.io`を含む場合は使用しないでください

