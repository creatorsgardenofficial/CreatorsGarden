# Creator Collab - アイデア共有＋コラボマッチング

創作者・アマチュアクリエイター向けのアイデア共有とコラボレーションプラットフォームです。

## 機能

- **ユーザー登録・ログイン**: 簡易認証システム
- **投稿機能**: 
  - 🤝 コラボ募集
  - 💡 アイデア共有
  - 🔍 パートナー探し
- **投稿一覧・詳細表示**: フィルター機能付き
- **コメント機能**: 投稿へのコメントが可能
- **タグ機能**: 投稿にタグを付けて検索性を向上

## 対応クリエイタータイプ

- 小説家
- イラストレーター
- 歌手
- 作曲者
- その他

## 技術スタック

- **フレームワーク**: Next.js 16 (App Router)
- **言語**: TypeScript
- **スタイリング**: Tailwind CSS
- **データストレージ**: JSONファイル（簡易版）

## セットアップ

### 必要な環境

- Node.js 18以上
- npm または yarn

### インストール

```bash
# 依存関係のインストール
npm install
```

### 開発サーバーの起動

```bash
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開いてください。

### ビルド

```bash
npm run build
npm start
```

## プロジェクト構造

```
creator-collab/
├── app/                    # Next.js App Router
│   ├── api/               # API エンドポイント
│   │   ├── auth/         # 認証関連
│   │   └── posts/        # 投稿関連
│   ├── posts/            # 投稿ページ
│   ├── login/            # ログインページ
│   ├── register/         # 登録ページ
│   └── page.tsx          # ホームページ
├── components/           # React コンポーネント
│   └── Navbar.tsx        # ナビゲーションバー
├── lib/                  # ユーティリティ
│   └── storage.ts        # データストレージ管理
├── types/                # TypeScript 型定義
│   └── index.ts
└── data/                 # データファイル（自動生成）
    ├── users.json
    ├── posts.json
    └── comments.json
```

## 使い方

1. **アカウント登録**
   - トップページから「今すぐ始める」をクリック
   - ユーザー名、メールアドレス、クリエイタータイプを入力して登録

2. **ログイン**
   - 登録時のメールアドレスでログイン（簡易版のためパスワード不要）

3. **投稿作成**
   - ログイン後、「投稿する」ボタンから新規投稿を作成
   - 投稿タイプ、タイトル、内容、タグを入力

4. **投稿閲覧**
   - 投稿一覧ページでフィルター機能を使用して投稿を検索
   - 投稿をクリックして詳細とコメントを確認

5. **コメント**
   - 投稿詳細ページでコメントを投稿・閲覧

## A8.net広告の設定

A8.netの広告をサイトに表示するには、以下の手順で設定してください。

1. `.env.local` ファイルを作成（`env.local.template`をコピー）
2. `NEXT_PUBLIC_A8_AD_CODE` 環境変数にA8.netの広告コードを設定

### 単一の広告コードを表示する場合

```bash
NEXT_PUBLIC_A8_AD_CODE="<script type=\"text/javascript\" src=\"https://statics.a8.net/a8sales/a8sales.js\"></script>
<a href=\"https://px.a8.net/svt/ejp?a8mat=...\" target=\"_blank\" rel=\"nofollow\">...</a>"
```

### 複数の広告コードをランダム表示する場合

JSON配列形式で設定すると、表示するたびにランダムに1つが選択されます。

```bash
NEXT_PUBLIC_A8_AD_CODE="[\"<script type=\\\"text/javascript\\\" src=\\\"https://statics.a8.net/a8sales/a8sales.js\\\"></script><a href=\\\"https://px.a8.net/svt/ejp?a8mat=...\\\" target=\\\"_blank\\\" rel=\\\"nofollow\\\">広告1</a>\", \"<script type=\\\"text/javascript\\\" src=\\\"https://statics.a8.net/a8sales/a8sales.js\\\"></script><a href=\\\"https://px.a8.net/svt/ejp?a8mat=...\\\" target=\\\"_blank\\\" rel=\\\"nofollow\\\">広告2</a>\"]"
```

**注意**: JSON配列形式の場合、各広告コード内のダブルクォートはエスケープ（`\"`）してください。

広告は以下の場所に表示されます：
- ホームページの下部
- 投稿一覧ページのページネーション下部

各表示ごとに異なる広告がランダムに表示されます。

## デプロイ

詳細なデプロイ手順は [DEPLOYMENT.md](./DEPLOYMENT.md) を参照してください。

### クイックスタート（Vercel）

1. [Vercel](https://vercel.com) でアカウント作成
2. GitHubリポジトリをインポート
3. 環境変数を設定（`.env.local`の内容をコピー）
4. デプロイ

デプロイ前のチェックリストは [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md) を参照してください。

## 注意事項

- このアプリケーションは簡易版です。本番環境で使用する場合は、セキュリティ強化（パスワード認証、データベース使用など）を推奨します。
- データは `data/` ディレクトリ内のJSONファイルに保存されます。
- Vercelなどのサーバーレス環境では、ファイルシステムへの書き込みが一時的です。本番環境ではデータベースへの移行を推奨します。

## ライセンス

このプロジェクトはMITライセンスの下で公開されています。
