# ブックマーク機能の実装状況

## ❌ 実装状況: 未実装

ブックマーク機能は**現在実装されていません**。

## ✅ 準備済みの部分

### 1. プラン制限の定義
- ✅ `lib/planLimits.ts`に`maxBookmarks`が定義されている
  - Free Plan: 10件まで
  - Grow Plan: 無制限
  - Bloom Plan: 無制限
- ✅ `canAddBookmark`関数が定義されている

### 2. UI表示
- ✅ `app/pricing/page.tsx`でプラン説明に表示されている
  - Free Plan: "ブックマーク：10件まで"
  - Grow Plan: "ブックマーク無制限"

## ❌ 未実装の部分

### 1. データモデル
- ❌ `types/index.ts`にブックマーク関連の型定義がない
- ❌ ブックマークデータを保存するJSONファイルがない

### 2. APIエンドポイント
- ❌ ブックマーク追加/削除のAPIエンドポイントがない
- ❌ ブックマーク一覧取得のAPIエンドポイントがない
- ❌ ブックマーク数の取得APIがない

### 3. フロントエンド
- ❌ 投稿一覧にブックマークボタンがない
- ❌ ブックマーク一覧ページがない
- ❌ ブックマーク数の表示がない

### 4. ストレージ関数
- ❌ `lib/storage.ts`にブックマーク関連の関数がない

## 📋 実装が必要な機能

### 1. データモデル
```typescript
// types/index.ts に追加が必要
export interface Bookmark {
  id: string;
  userId: string;
  postId: string;
  createdAt: string;
}

// User インターフェースに追加
export interface User {
  // ... 既存のフィールド
  bookmarks?: string[]; // ブックマークした投稿IDの配列
}
```

### 2. APIエンドポイント
- `POST /api/bookmarks` - ブックマーク追加
- `DELETE /api/bookmarks/[postId]` - ブックマーク削除
- `GET /api/bookmarks` - ブックマーク一覧取得
- `GET /api/bookmarks/count` - ブックマーク数取得

### 3. ストレージ関数
- `createBookmark(userId, postId)` - ブックマーク作成
- `deleteBookmark(userId, postId)` - ブックマーク削除
- `getBookmarksByUserId(userId)` - ユーザーのブックマーク取得
- `getBookmarkCount(userId)` - ブックマーク数取得
- `isBookmarked(userId, postId)` - ブックマーク済みかチェック

### 4. フロントエンド
- 投稿一覧にブックマークボタン
- ブックマーク一覧ページ (`/bookmarks`)
- ブックマーク数の表示
- プラン制限のチェックとエラーメッセージ

## 🔍 現在の状態

- **プラン制限の定義**: ✅ 準備済み
- **UI表示**: ✅ プランページに表示されている
- **実際の機能**: ❌ 未実装

## 📝 まとめ

ブックマーク機能は、プラン制限の定義とUI表示は準備されていますが、**実際の機能は実装されていません**。

ユーザーがブックマーク機能を使用することはできませんが、プランページには表示されているため、実装が必要です。

