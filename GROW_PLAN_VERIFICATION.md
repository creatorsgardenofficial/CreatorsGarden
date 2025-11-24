# Grow Plan機能実装確認レポート

## 確認日時
2025年1月（実装完了時点）

## Grow Planの機能一覧と実装状況

### ✅ 1. 投稿の優先表示
**実装状況**: ✅ 完全実装

#### 1-1. 投稿が一覧の最上部に固定
**確認箇所**:
- `app/api/posts/route.ts` - GETエンドポイント（ソート処理）
- `app/posts/page.tsx` - 投稿一覧ページ

**実装内容**:
```typescript
// app/api/posts/route.ts (47-58行目)
posts.sort((a, b) => {
  // 優先表示フラグがある投稿を先に
  if (a.priorityDisplay && !b.priorityDisplay) return -1;
  if (!a.priorityDisplay && b.priorityDisplay) return 1;
  
  // 同じ優先度の場合は新しい順
  const dateA = new Date(a.createdAt).getTime();
  const dateB = new Date(b.createdAt).getTime();
  return dateB - dateA; // 新しい順（降順）
});
```

**動作確認**: ✅ Grow Planユーザーの投稿は常に最上部に表示される

---

#### 1-2. "注目のアイデア" 枠に掲載
**確認箇所**:
- `app/posts/page.tsx` - 583-593行目

**実装内容**:
```typescript
{/* 注目のアイデア枠（Grow Plan以上の投稿） */}
{currentPosts.some(p => p.featuredDisplay) && (
  <div className="mb-6 sm:mb-8">
    <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4">
      ⭐ 注目のアイデア
    </h2>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6">
      {currentPosts
        .filter(p => p.featuredDisplay)
        .map((post) => (
          // 特別なスタイリングで表示
        ))}
    </div>
  </div>
)}
```

**動作確認**: ✅ Grow Planユーザーの投稿は"注目のアイデア"枠に表示される

---

#### 1-3. DMの返信率UP
**実装状況**: ℹ️ 機能的な実装ではなく、効果の説明

**説明**: これは機能的な実装というより、優先表示によって投稿が見つかりやすくなり、結果としてDMの返信率が上がるという効果の説明です。直接的な機能実装は不要です。

---

### ✅ 2. 拡張タグ（タグ10個まで）
**実装状況**: ✅ 完全実装

**確認箇所**:
- `lib/planLimits.ts` - Grow Plan: `maxTags: 10`
- `app/posts/new/page.tsx` - 新規投稿時のタグ数チェック
- `app/posts/[id]/edit/page.tsx` - 投稿編集時のタグ数チェック
- `app/api/posts/route.ts` - POST時のタグ数チェック
- `app/api/posts/[id]/route.ts` - PUT時のタグ数チェック

**実装内容**:
- Free Plan: 3個まで
- Grow Plan: 10個まで（3個から7個増加）
- Bloom Plan: 20個まで

**動作確認**:
- ✅ Free Plan: 3個まで（4個目でエラー）
- ✅ Grow Plan: 10個まで（11個目でエラー）
- ✅ プラン変更時に既存投稿のタグ数制限も更新される

---

### ✅ 3. ブックマーク無制限
**実装状況**: ✅ 完全実装

**確認箇所**:
- `lib/planLimits.ts` - Grow Plan: `maxBookmarks: Infinity`
- `app/api/bookmarks/route.ts` - POST時のブックマーク数チェック

**実装内容**:
```typescript
// lib/planLimits.ts
grow: {
  maxTags: 10,
  maxBookmarks: Infinity, // 無制限
  priorityDisplay: true,
  featuredDisplay: true,
},
```

**動作確認**:
- ✅ Free Plan: 10件まで（11件目でエラー）
- ✅ Grow Plan: 無制限（何件でも追加可能）
- ✅ Bloom Plan: 無制限

---

### ✅ 4. 無料で使える機能もすべて利用可能
**実装状況**: ✅ 完全実装

**確認内容**:
- ✅ 投稿機能（制限なし）
- ✅ コメント/いいね機能（制限なし）
- ✅ DM/グループチャット機能（制限なし）
- ✅ プロフィール作成機能（制限なし）

**動作確認**: ✅ Grow PlanユーザーはFree Planのすべての機能を利用可能

---

## プラン変更時の自動更新機能

### ✅ プラン変更時に既存投稿のフラグを自動更新
**確認箇所**:
- `app/api/stripe/webhook/route.ts` - Webhook処理
- `app/api/stripe/create-checkout/route.ts` - チェックアウト処理
- `lib/storage.ts` - `createPost`, `updatePost`関数

**実装内容**:

#### 1. 新規投稿作成時
```typescript
// lib/storage.ts (createPost関数)
const isActive = user.subscription?.status === 'active';
const shouldHavePriority = (planType === 'grow' || planType === 'bloom') && isActive;

const newPost: Post = {
  // ...
  priorityDisplay: shouldHavePriority,
  featuredDisplay: shouldHavePriority,
  // ...
};
```

#### 2. プラン変更時（Webhook）
```typescript
// app/api/stripe/webhook/route.ts
// プラン変更に伴い、既存の投稿の優先表示フラグを更新
const isActive = subscription.status === 'active';
const shouldHavePriority = (planType === 'grow' || planType === 'bloom') && isActive;

const posts = await getPosts();
let updated = false;
for (let i = 0; i < posts.length; i++) {
  if (posts[i].userId === userId) {
    posts[i].priorityDisplay = shouldHavePriority;
    posts[i].featuredDisplay = shouldHavePriority;
    posts[i].updatedAt = new Date().toISOString();
    updated = true;
  }
}
if (updated) {
  await savePosts(posts);
}
```

#### 3. プラン変更時（チェックアウト）
```typescript
// app/api/stripe/create-checkout/route.ts
// 既存のサブスクリプションを更新する場合も同様に処理
```

**動作確認**:
- ✅ Grow Planにアップグレード: 既存投稿が自動的に優先表示枠に移動
- ✅ Free Planにダウングレード: 既存投稿の優先表示フラグが自動的に解除
- ✅ 新規投稿: プランに応じて自動的にフラグが設定される

---

## プラン制限の適用状況

### タグ制限
- **フロントエンド**: ✅ 実装済み（UIで制限を表示）
- **バックエンド**: ✅ 実装済み（APIレベルでチェック）

### ブックマーク制限
- **フロントエンド**: ⚠️ 未実装（現在のブックマーク数を表示していない）
- **バックエンド**: ✅ 実装済み（APIレベルでチェック）

### 優先表示フラグ
- **自動設定**: ✅ 実装済み（投稿作成時、プラン変更時）
- **表示**: ✅ 実装済み（投稿一覧で優先表示）

---

## 総合評価

### ✅ すべての機能が実装されています

1. **投稿の優先表示**: ✅ 完全実装
   - 最上部に固定表示
   - "注目のアイデア"枠に掲載
   
2. **拡張タグ（10個まで）**: ✅ 完全実装
   - Free Plan: 3個 → Grow Plan: 10個
   
3. **ブックマーク無制限**: ✅ 完全実装
   - Free Plan: 10件 → Grow Plan: 無制限
   
4. **無料機能の利用**: ✅ 完全実装
   - すべてのFree Plan機能が利用可能

### プラン変更時の自動更新

- ✅ 新規投稿: プランに応じて自動的にフラグ設定
- ✅ 既存投稿: プラン変更時に自動的にフラグ更新
- ✅ ダウングレード: 自動的にフラグ解除

---

## 推奨事項

1. **フロントエンドでのブックマーク数表示**:
   - 現在のブックマーク数と制限を表示するとUXが向上
   - 特にFree Planユーザーに「あとX件まで」と表示

2. **プランページへの直接リンク**:
   - エラーメッセージにプランページへの直接リンクを追加

3. **優先表示の視覚的フィードバック**:
   - 優先表示されている投稿に「優先表示」バッジを追加すると分かりやすい

---

## 結論

**Grow Planのすべての機能が正しく実装され、制限も適切に適用されています。**

特に重要な点:
- プラン変更時に既存投稿の優先表示フラグが自動更新される
- タグ制限とブックマーク制限が正しく動作している
- 優先表示と"注目のアイデア"枠が正しく機能している

