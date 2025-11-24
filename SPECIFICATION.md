# Creators Garden システム仕様書

## 目次
1. [システム概要](#システム概要)
2. [技術スタック](#技術スタック)
3. [認証・ユーザー管理機能](#認証ユーザー管理機能)
4. [投稿機能](#投稿機能)
5. [コメント機能](#コメント機能)
6. [いいね機能](#いいね機能)
7. [挙げ機能](#挙げ機能)
8. [ブックマーク機能](#ブックマーク機能)
9. [メッセージング機能](#メッセージング機能)
10. [フィードバック機能](#フィードバック機能)
11. [プラン管理機能](#プラン管理機能)
12. [管理者機能](#管理者機能)
13. [プロフィール機能](#プロフィール機能)
14. [お知らせ機能](#お知らせ機能)
15. [セキュリティ機能](#セキュリティ機能)
16. [UI/UX機能](#uiux機能)
17. [APIエンドポイント一覧](#apiエンドポイント一覧)
18. [データモデル](#データモデル)

---

## システム概要

**Creators Garden（クリエイターズガーデン）**は、クリエイター同士がコラボレーションやアイデア共有を行うためのプラットフォームです。小説家、イラストレーター、音楽家、ゲームクリエイターなど、様々なジャンルのクリエイターが集まり、作品を共に生み出す場を提供します。

### 主な特徴
- 投稿ベースのコラボレーションマッチング
- リアルタイムメッセージング（DM・グループチャット）
- いいね機能によるエンゲージメント
- ブックマーク機能
- 投稿の「挙げ」機能（24時間に1回）
- フィードバックシステム
- プラン管理（Free Plan、Grow Plan、Bloom Plan）
- 管理者によるユーザー管理・コンテンツ管理
- 包括的なセキュリティ対策

### 対応クリエイタータイプ
1. **小説家** (Writer)
2. **イラストレーター** (Illustrator)
3. **漫画家 / マンガ制作** (Manga Artist)
4. **作曲家 / ボカロP** (Composer)
5. **歌手 / 歌い手** (Singer)
6. **声優 / ナレーター** (Voice Actor)
7. **ゲームクリエイター** (Game Creator)
8. **動画編集者 / アニメーター** (Video Creator)
9. **3Dモデラー** (3D Artist)
10. **Live2D モデラー** (Live2D Modeler)
11. **Webエンジニア / プログラマー** (Developer)
12. **その他** (Other)

---

## 技術スタック

- **フレームワーク**: Next.js 16.0.1 (App Router)
- **言語**: TypeScript
- **UI**: React 19.2.0
- **スタイリング**: Tailwind CSS 4
- **データストレージ**: JSONファイル（`data/`ディレクトリ）
- **認証**: Cookieベース（`userId`、HttpOnly、Secure）
- **パスワードハッシュ化**: bcryptjs
- **メール送信**: Nodemailer（SMTP）
- **決済**: Stripe API
- **セキュリティ**: CSRFトークン、レート制限、コンテンツフィルタリング

---

## 認証・ユーザー管理機能

### ユーザー登録
- **エンドポイント**: `POST /api/auth/register`
- **必須項目**:
  - ユーザー名（最大100文字、不適切な言葉フィルタリング）
  - メールアドレス（形式検証）
  - パスワード（8文字以上、小文字アルファベットと数字を含む）
  - クリエイタータイプ（12種類から選択）
- **オプション項目**:
  - 自己紹介（最大500文字、不適切な言葉フィルタリング）
  - 作品URL（最大3つ、各URLに説明を追加可能、最大100文字）
- **機能**:
  - パスワード強度バリデーション
  - パスワードハッシュ化（bcrypt）
  - 不適切な言葉のフィルタリング
  - スパムパターン検出
  - 自動的に`publicId`を生成（グループチャット用）
  - URL検証（SSRF対策）

### ログイン
- **エンドポイント**: `POST /api/auth/login`
- **認証方式**: メールアドレス + パスワード
- **セッション管理**: Cookieに`userId`を保存（HttpOnly、Secure、SameSite: lax）
- **CSRFトークン**: ログイン成功時に生成（30分間有効）
- **機能**:
  - 利用停止アカウントのチェック
  - アカウントロック状態のチェック
  - 連続ログイン失敗時の自動ロック（5回失敗で30分間ロック）
  - ログイン成功時に失敗回数をリセット
  - 自動ログアウト（利用停止の場合）
  - セキュリティログへの記録

### ログアウト
- **エンドポイント**: `POST /api/auth/logout`
- **機能**: Cookieから`userId`と`csrfToken`を削除

### パスワードリセット
- **エンドポイント**: 
  - `POST /api/auth/forgot-password` - パスワードリセット申請
  - `GET /api/auth/reset-password?token=[token]` - トークン検証
  - `POST /api/auth/reset-password` - パスワードリセット実行
- **機能**:
  - メールアドレスでパスワードリセット申請
  - 24時間有効なトークンを生成
  - メールでリセットリンクを送信（SMTP設定時）
  - トークン検証とパスワード更新
  - 使用済みトークンの無効化

### ユーザー情報取得
- **エンドポイント**: `GET /api/auth/me`
- **機能**:
  - 未ログイン時は`{ user: null }`を返す（200ステータス）
  - ログイン時はユーザー情報を返す
  - 利用停止チェック
  - アカウントロックチェック
  - サブスクリプション状態の自動同期（10分間隔）

### プロフィール管理
- **エンドポイント**: 
  - `GET /api/auth/profile` - プロフィール取得
  - `PUT /api/auth/profile` - プロフィール更新
- **更新可能項目**:
  - ユーザー名（最大100文字、不適切な言葉フィルタリング）
  - 自己紹介（最大500文字、不適切な言葉フィルタリング）
  - クリエイタータイプ
  - 作品URL（最大3つ、各URLに説明を追加可能、最大100文字）
- **機能**:
  - コンテンツフィルタリング
  - URL検証（SSRF対策）
  - クリエイタータイプ変更時に投稿の`creatorType`も自動更新

---

## 投稿機能

### 投稿タイプ
1. **コラボ募集** (`collab`) - 共同制作のパートナーを募集
2. **アイデア共有** (`idea`) - アイデアやコンセプトを共有
3. **パートナー探し** (`seeking`) - 特定のスキルを持つパートナーを探す

### 投稿ステータス
- **メンバー募集中** (`open`) - デフォルト
- **メンバー決定** (`closed`) - パートナーが見つかった

### 投稿作成
- **エンドポイント**: `POST /api/posts`
- **必須項目**:
  - 投稿タイプ
  - タイトル（最大100文字、不適切な言葉フィルタリング）
  - 内容（最大1000文字、不適切な言葉フィルタリング）
- **オプション項目**:
  - タグ（プランによる制限あり、各タグ最大30文字、合計最大200文字、不適切な言葉フィルタリング）
  - 関連URL（最大3つ、各URLに説明を追加可能、説明は最大100文字、不適切な言葉フィルタリング）
- **機能**:
  - コンテンツフィルタリング（不適切な言葉、スパムパターン）
  - スパム対策（10分以内に同じ内容の投稿をブロック、10分以内に5件以上の投稿をブロック）
  - 自動的に投稿者情報を付与
  - プランによる優先表示フラグの設定（Grow Plan以上）

### 投稿一覧
- **エンドポイント**: `GET /api/posts`
- **フィルター機能**:
  - 投稿タイプ
  - クリエイタータイプ
  - ステータス（メンバー募集中/メンバー決定）
  - タグ（複数選択可、AND/OR検索）
  - ユーザーID（特定ユーザーの投稿のみ）
  - ワード検索（タイトル・内容の部分一致、大文字小文字を区別しない）
- **ソート順序**:
  1. 優先表示フラグが`true`の投稿（Grow Plan以上）
  2. Grow Plan投稿の中でのランダム順
  3. 挙げた投稿（`bumpedAt`の降順）
  4. その他の投稿（`createdAt`の降順）
- **ページネーション**: 10件、30件、50件、100件から選択可能（デフォルト: 50件）

### 投稿詳細
- **エンドポイント**: `GET /api/posts/[id]`
- **表示内容**:
  - 投稿情報
  - コメント一覧
  - いいね数
  - 投稿者のプロフィールリンク
  - 複数URLの表示（「リンクを開く」ボタン、説明付き）
  - 管理者による削除メッセージ（削除された場合）

### 投稿編集・削除
- **エンドポイント**: 
  - `PUT /api/posts/[id]` - 編集
  - `DELETE /api/posts/[id]` - 削除
- **権限**: 
  - 編集・削除: 投稿者のみ
  - 管理者削除: 管理者のみ（メッセージを残す削除）
- **機能**:
  - ステータス変更（メンバー募集中 ↔ メンバー決定）
  - コンテンツフィルタリング
  - スパム対策
  - 管理者による削除時は「管理者が不適切とみなしたため、削除いたしました。」というメッセージを表示

### 投稿の挙げ機能
- **エンドポイント**: `POST /api/posts/[id]/bump`
- **機能**:
  - 24時間に1回のみ実行可能（ユーザー単位）
  - 投稿を投稿一覧の上位に再配置
  - `bumpedAt`フィールドを更新
  - `lastBumpAt`フィールドを更新（ユーザー単位のクールタイム管理）
- **UI**: 「⇧挙げ」ボタン（投稿詳細ページ、マイページの投稿一覧）
- **クールタイム表示**: 次に挙げられる時刻を表示

---

## コメント機能

### コメント投稿
- **エンドポイント**: `POST /api/posts/[id]/comments`
- **必須項目**: コメント内容（最大500文字、不適切な言葉フィルタリング）
- **機能**:
  - コンテンツフィルタリング（不適切な言葉、スパムパターン）
  - スパム対策（5分以内に同じ内容のコメントをブロック、5分以内に10件以上のコメントをブロック）
  - 投稿者情報の自動付与

### コメント取得
- **エンドポイント**: `GET /api/posts/[id]/comments`
- **ソート**: 作成日時の昇順（古い順）
- **表示**: 管理者による削除メッセージ（削除された場合）

### コメント編集・削除
- **エンドポイント**: 
  - `PUT /api/comments/[id]` - 編集
  - `DELETE /api/comments/[id]` - 削除
- **権限**: 
  - 編集・削除: コメント投稿者のみ
  - 管理者削除: 管理者のみ（メッセージを残す削除）
- **機能**: 
  - コンテンツフィルタリング
  - スパム対策
  - 管理者による削除時は「管理者が不適切とみなしたため、削除いたしました。」というメッセージを表示

---

## いいね機能

### いいねの追加/削除
- **エンドポイント**: `POST /api/posts/[id]/like`
- **機能**:
  - トグル機能（いいね済みの場合は削除、未いいねの場合は追加）
  - ログインユーザー: ユーザーIDで管理
  - 未ログインユーザー: セッションIDで管理（30日間有効）
- **レスポンス**: 
  - `isLiked`: いいね済みかどうか
  - `likesCount`: いいね数
  - `post`: 更新された投稿情報

### いいね状態の取得
- **エンドポイント**: `GET /api/posts/[id]/like`
- **レスポンス**: 
  - `isLiked`: いいね済みかどうか
  - `likesCount`: いいね数

---

## 挙げ機能

### 投稿の挙げ
- **エンドポイント**: `POST /api/posts/[id]/bump`
- **機能**:
  - 24時間に1回のみ実行可能（ユーザー単位）
  - 投稿を投稿一覧の上位に再配置
  - `bumpedAt`フィールドを更新
  - `lastBumpAt`フィールドを更新（ユーザー単位のクールタイム管理）
- **UI**: 「⇧挙げ」ボタン（投稿詳細ページ、マイページの投稿一覧）
- **クールタイム表示**: 次に挙げられる時刻を表示

### 挙げ状態の取得
- **エンドポイント**: `GET /api/posts/[id]/bump`
- **レスポンス**: 
  - `canBump`: 挙げ可能かどうか
  - `nextBumpAt`: 次に挙げられる時刻
  - `hoursRemaining`: 残り時間（時間）
  - `minutesRemaining`: 残り時間（分）

---

## ブックマーク機能

### ブックマーク追加/削除
- **エンドポイント**: `POST /api/bookmarks`
- **機能**:
  - トグル機能（ブックマーク済みの場合は削除、未ブックマークの場合は追加）
  - プランによる制限（Free Plan: 10件まで、Grow Plan以上: 無制限）

### ブックマーク一覧取得
- **エンドポイント**: `GET /api/bookmarks`
- **機能**: ログインユーザーのブックマーク一覧を取得

### ブックマーク数取得
- **エンドポイント**: `GET /api/bookmarks/count`
- **機能**: ログインユーザーのブックマーク数を取得

---

## メッセージング機能

### ダイレクトメッセージ（DM）

#### 会話一覧取得
- **エンドポイント**: `GET /api/messages`
- **機能**:
  - ログインユーザーの会話一覧を取得
  - 各会話の最新メッセージと未読数を表示
  - 相手ユーザー情報を含む
  - ブロックされたユーザーとの会話を除外
  - ユーザー名検索機能（部分一致）
  - クリエイタータイプフィルター
  - ページネーション（10件ずつ、無限スクロール）

#### メッセージ送信
- **エンドポイント**: `POST /api/messages`
- **必須項目**:
  - `receiverId`: 受信者のユーザーID
  - `content`: メッセージ内容（不適切な言葉フィルタリング）
- **機能**:
  - 自動的に会話を作成（存在しない場合）
  - コンテンツフィルタリング
  - スパム対策
  - ブロックされたユーザーへの送信をブロック
  - ブロックされたユーザーからの受信をブロック
  - 既読状態の管理

#### メッセージ取得
- **エンドポイント**: `GET /api/messages?conversationId=[id]`
- **機能**:
  - 特定の会話のメッセージ一覧を取得
  - 取得時に自動的に既読にする
  - ブロックされたユーザーのメッセージを除外

#### メッセージ編集・削除
- **エンドポイント**: 
  - `PUT /api/messages/[id]` - 編集
  - `DELETE /api/messages/[id]` - 削除
- **権限**: 送信者のみ
- **機能**: コンテンツフィルタリング

#### 未読メッセージ数取得
- **エンドポイント**: `GET /api/messages?unreadCount=true`
- **機能**: 全会話の未読メッセージ数の合計を取得

#### DMブロック機能
- **エンドポイント**: 
  - `POST /api/messages/block` - ユーザーをブロック
  - `DELETE /api/messages/block` - ユーザーのブロック解除
  - `GET /api/messages/block?userId=[id]` - ブロック状態の確認
- **機能**:
  - ブロックされたユーザーとのメッセージ交換を防止
  - ブロックされたユーザーとの会話を非表示
  - ブロック状態の管理

### グループチャット

#### グループチャット作成
- **エンドポイント**: `POST /api/group-chats`
- **必須項目**:
  - `name`: グループ名（不適切な言葉フィルタリング）
  - `participantIds`: 参加者IDの配列（作成者を含む、2人以上）
- **オプション項目**:
  - `description`: グループ説明（不適切な言葉フィルタリング）
- **機能**:
  - 参加者は2人以上
  - 作成者が自動的に参加者に追加
  - ユーザー検索機能（表示用ID、ユーザー名の部分一致）
  - 参加者の表示用IDとユーザー名を表示

#### グループチャット一覧取得
- **エンドポイント**: `GET /api/group-chats`
- **機能**:
  - ログインユーザーが参加しているグループチャット一覧
  - 各グループの最新メッセージと未読数を表示
  - 参加者情報を含む

#### メッセージ送信
- **エンドポイント**: `POST /api/group-chats/messages`
- **必須項目**:
  - `groupChatId`: グループチャットID
  - `content`: メッセージ内容（不適切な言葉フィルタリング）
- **機能**:
  - コンテンツフィルタリング
  - スパム対策
  - 既読状態の管理（送信者は自動的に既読）
  - ファイル添付（対応形式は要確認）

#### メッセージ取得
- **エンドポイント**: `GET /api/group-chats/messages?groupChatId=[id]`
- **機能**:
  - 特定のグループチャットのメッセージ一覧を取得
  - 取得時に自動的に既読にする

#### メッセージ編集・削除
- **エンドポイント**: 
  - `PUT /api/group-chats/messages/[id]` - 編集
  - `DELETE /api/group-chats/messages/[id]` - 削除
- **権限**: 送信者のみ
- **機能**: コンテンツフィルタリング

#### グループチャット退出
- **エンドポイント**: `PUT /api/group-chats`（`action: 'leave'`）
- **機能**:
  - ログインユーザーをグループチャットから退出
  - 参加者リストから削除

#### 未読メッセージ数取得
- **エンドポイント**: `GET /api/group-chats?unreadCount=true`
- **機能**: 全グループチャットの未読メッセージ数の合計を取得

#### ユーザー検索（グループチャット用）
- **エンドポイント**: `GET /api/users/search?publicId=[id]` または `GET /api/users/search?username=[name]`
- **機能**: 
  - `publicId`でユーザーを検索（完全一致）
  - `username`でユーザーを検索（部分一致、複数結果を返す）
  - グループチャットへの招待用

---

## フィードバック機能

### フィードバック送信
- **エンドポイント**: `POST /api/feedback`
- **必須項目**:
  - 件名（機能要望、バグ報告、改善提案、その他）
  - メッセージ（不適切な言葉フィルタリング）
- **オプション項目**:
  - お名前（ニックネーム）
  - メールアドレス（形式検証）
- **機能**:
  - ログインユーザーの場合は自動的にユーザーIDとメールアドレスを付与
  - コンテンツフィルタリング

### 自分のフィードバック取得
- **エンドポイント**: `GET /api/feedback/my`
- **機能**:
  - ログインユーザーが送信したフィードバック一覧を取得
  - 管理者からの返信を含む
  - 新しい順にソート

### メッセージ送信（フィードバック内）
- **エンドポイント**: `POST /api/feedback/[id]/messages`
- **機能**:
  - ユーザーと管理者の間で複数回のメッセージ交換が可能
  - コンテンツフィルタリング

### 通知機能
- **エンドポイント**: `GET /api/feedback/notifications`
- **機能**:
  - **管理者**: 未返信のフィードバック数を取得
  - **ユーザー**: 管理者からの返信があるフィードバック数を取得
- **通知管理**:
  - ユーザー: `localStorage`に`readReplyIds`を保存
  - 管理者: `localStorage`に`adminFeedbackLastViewed`を保存

---

## プラン管理機能

### プラン種類

#### Free Plan（無料プラン）
- **価格**: 無料
- **機能**:
  - 投稿作成（無制限）
  - コメント（無制限）
  - いいね（無制限）
  - DM・グループチャット（無制限）
  - タグ: 最大3個
  - ブックマーク: 最大10件
  - 優先表示: なし
  - 挙げ機能: 24時間に1回

#### Grow Plan（成長プラン）
- **価格**: 準備中（現在は新規契約不可）
- **機能**:
  - Free Planのすべての機能
  - タグ: 最大10個
  - ブックマーク: 無制限
  - 優先表示: あり（投稿一覧の上位に表示）
  - ランダム表示: Grow Plan投稿の中でのランダム順
  - 注目のアイデア枠: あり

#### Bloom Plan（開花プラン）
- **価格**: 有料（Stripeで設定）
- **機能**:
  - Grow Planのすべての機能
  - タグ: 最大20個
  - ブックマーク: 無制限
  - 優先表示: あり
  - 注目のアイデア枠: あり

### プラン管理
- **エンドポイント**: 
  - `GET /api/stripe/config` - Stripe公開キー取得
  - `POST /api/stripe/create-checkout` - チェックアウトセッション作成
  - `GET /api/stripe/check-session` - セッション状態確認
  - `POST /api/stripe/create-portal` - 顧客ポータル作成（プラン変更・キャンセル）
  - `POST /api/stripe/sync-subscription` - サブスクリプション状態の手動同期
  - `POST /api/stripe/webhook` - Stripe Webhook（自動同期）
- **機能**:
  - Stripeとの統合
  - サブスクリプション管理
  - 自動プラン切り替え（期限切れ時、キャンセル時）
  - 即時キャンセル時の自動反映
  - プラン変更に伴う投稿フラグの自動更新

---

## 管理者機能

### 管理者認証
- **エンドポイント**: `GET /api/admin/check`
- **機能**: 現在のユーザーが管理者かどうかを判定
- **管理者判定**: メールアドレスで判定（デフォルト: `creators.garden.official@gmail.com`、環境変数`ADMIN_EMAILS`で追加可能）

### フィードバック管理
- **エンドポイント**: 
  - `GET /api/admin/feedback` - フィードバック一覧取得
  - `DELETE /api/admin/feedback` - フィードバック削除
  - `POST /api/admin/feedback/[id]/reply` - 返信送信
- **機能**:
  - すべてのフィードバックを表示
  - 新しい順にソート
  - メッセージのやり取りが可能
  - フィードバックの削除

### セキュリティログ管理
- **エンドポイント**: `GET /api/admin/security-logs`
- **機能**:
  - セキュリティイベントのログ一覧を表示
  - フィルター機能（種類、重要度、ユーザー、日時範囲）
  - 異常検知サマリー（過去24時間）
  - ログの種類:
    - ログイン試行（成功/失敗）
    - レート制限超過
    - CSRF失敗
    - 管理者操作
    - アカウント状態変更
    - アカウントロック
    - パスワード変更
    - 不正アクセス試行

### ユーザー管理
- **エンドポイント**: 
  - `GET /api/admin/users` - ユーザー一覧取得
  - `PUT /api/admin/users` - ユーザー情報更新
  - `POST /api/admin/users/[id]/unlock` - アカウントロック解除
- **機能**:
  - 全ユーザー一覧の表示
  - パスワード変更
  - アカウントの利用停止/有効化
  - アカウントロック状態の表示
  - アカウントロック解除（管理者のみ）
  - 利用停止されたユーザーは自動的にログアウトされる

### お知らせ管理
- **エンドポイント**: 
  - `GET /api/announcements` - お知らせ一覧取得
  - `POST /api/announcements` - お知らせ作成
  - `PUT /api/announcements` - お知らせ更新
  - `DELETE /api/announcements` - お知らせ削除
- **機能**:
  - お知らせのCRUD操作
  - お知らせタイプの選択（緊急、メンテナンス、通常、警告、成功）
  - 表示/非表示の切り替え
  - 公開日時・有効期限の設定
  - 投稿一覧ページの上部に表示

### 投稿・コメント管理
- **機能**:
  - 管理者による投稿削除（メッセージを残す削除）
  - 管理者によるコメント削除（メッセージを残す削除）
  - 削除メッセージ: 「管理者が不適切とみなしたため、削除いたしました。」

---

## プロフィール機能

### 自分のプロフィール
- **ページ**: `/profile`
- **機能**:
  - プロフィール情報の表示・編集
  - 自分の投稿一覧の表示
  - 投稿のステータス表示（メンバー募集中/メンバー決定）
  - 投稿の「挙げ」機能（24時間クールタイム表示）
  - 表示用ID（`publicId`）の表示・コピー

### 他のユーザーのプロフィール
- **ページ**: `/users/[id]`
- **エンドポイント**: `GET /api/users/[id]`
- **機能**:
  - ユーザー情報の表示
  - そのユーザーの投稿一覧の表示
  - プロフィールからDMを開始可能
  - 表示用ID（`publicId`）の表示・コピー

### ユーザー一覧
- **エンドポイント**: `GET /api/users`
- **機能**: 全ユーザー一覧を取得（ページネーション対応、10件ずつ）

### ユーザー検索
- **エンドポイント**: `GET /api/users/search?publicId=[id]` または `GET /api/users/search?username=[name]`
- **機能**: 
  - `publicId`でユーザーを検索（完全一致）
  - `username`でユーザーを検索（部分一致、複数結果を返す）

---

## お知らせ機能

### お知らせ表示
- **ページ**: `/posts`（投稿一覧ページの上部）
- **エンドポイント**: `GET /api/announcements?visibleOnly=true`
- **機能**:
  - 表示可能なお知らせのみを取得
  - 公開日時・有効期限のチェック
  - お知らせタイプに応じたデザイン（緊急、メンテナンス、通常、警告、成功）

### お知らせ管理（管理者のみ）
- **ページ**: `/admin`（お知らせ管理タブ）
- **機能**:
  - お知らせの作成・編集・削除
  - お知らせタイプの選択
  - 表示/非表示の切り替え
  - 公開日時・有効期限の設定

---

## セキュリティ機能

### コンテンツフィルタリング
- **不適切な言葉の検出**: 日本語・英語の不適切な言葉を検出
- **スパムパターン検出**:
  - 連続した同じ文字（5文字以上）
  - 繰り返しパターン（同じ文字列が3回以上）
  - 特殊文字の過度な使用（全体の30%以上）
  - URLの過度な含まれ（3つ以上）
  - 数字のみの文字列（10文字以上）
  - 空白文字の過度な使用（全体の50%以上）
  - 絵文字・記号の過度な使用（全体の40%以上）
  - 大文字のみの文字列（英語、10文字以上）
  - 同じ単語の繰り返し（5回以上）
- **適用範囲**: 投稿、コメント、メッセージ、プロフィール、フィードバック

### スパム対策
- **同一内容チェック**:
  - 投稿: 10分以内に90%以上同じ内容の投稿をブロック
  - コメント: 5分以内に90%以上同じ内容のコメントをブロック
- **投稿頻度制限**:
  - 投稿: 10分以内に5件以上の投稿をブロック
  - コメント: 5分以内に10件以上のコメントをブロック

### パスワード要件
- 8文字以上
- 小文字アルファベットと数字を含む
- **パスワードハッシュ化**: bcryptを使用した安全なパスワード保存（salt rounds: 10）

### 認証・認可
- Cookieベースのセッション管理（HttpOnly、Secure、SameSite: lax）
- CSRFトークンによる保護（30分間有効）
- 投稿・コメント・メッセージの編集・削除は投稿者のみ
- 管理者機能は管理者のみアクセス可能
- 利用停止ユーザーのチェック（19箇所で実装）

### アカウントロック機能
- **自動ロック**: 連続5回のログイン失敗で30分間ロック
- **ロック解除**: 
  - 時間経過による自動解除
  - 管理者による手動解除
- **ログイン成功時**: 失敗回数とロック状態をリセット

### レート制限
- IPアドレスベースのレート制限
- エンドポイント別の制限設定:
  - ログイン: 15分間に5回（本番環境）
  - 登録: 1時間に3回（本番環境）
  - 投稿: 1時間に10回（本番環境）
  - コメント: 1時間に20回（本番環境）
  - メッセージ: 1時間に30回（本番環境）
- レート制限超過時は429ステータスコードを返す

### セキュリティヘッダー
- `X-Frame-Options: SAMEORIGIN`
- `X-Content-Type-Options: nosniff`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`

### セキュリティログ
- ログイン試行の記録（成功/失敗）
- レート制限超過の記録
- CSRF失敗の記録
- 管理者操作の記録
- アカウント状態変更の記録
- アカウントロックの記録
- パスワード変更の記録
- 不正アクセス試行の記録
- 異常検知機能（過去24時間の統計）

### URL検証（SSRF対策）
- 許可されたプロトコルのみ（http, https）
- ローカルホスト・プライベートIPをブロック
- 投稿URL、プロフィールURL、フィードバックURLに適用

### 機密情報の保護
- 本番環境では機密情報（ユーザーID、メールアドレス、トークン）をログに出力しない
- 開発環境のみで詳細ログを出力（機密情報はマスク）

---

## UI/UX機能

### レスポンシブデザイン
- **モバイル対応**: スマートフォン向けの最適化
  - ハンバーガーメニューとサイドバー
  - タッチ操作に最適化されたUI
- **タブレット対応**: タブレット向けのレイアウト調整
- **デスクトップ対応**: 大画面向けのレイアウト

### ダークモード
- Tailwind CSSのダークモード対応
- システム設定に応じた自動切り替え

### 通知機能
- **ヘッダー通知**:
  - 未読メッセージ数（DM + グループチャット）
  - フィードバック通知（管理者・ユーザー）
- **通知の管理**:
  - 確認時に自動的に通知が消える
  - `localStorage`で通知状態を管理

### ナビゲーション
- **ヘッダー（Navbar）**:
  - ロゴ（Creators Garden）
  - 投稿一覧
  - マイページ
  - チャット（DM + グループチャット統合）
  - 管理者ページ（管理者のみ）
  - ログイン/新規登録（未ログイン時）
  - ログアウト（ログイン時）
- **ハンバーガーメニュー**: モバイル表示時にサイドバーを表示

### テキスト折り返し
- 長い文字列の自動折り返し
- `word-break: break-all`、`overflow-wrap: anywhere`を使用

---

## APIエンドポイント一覧

### 認証関連
- `POST /api/auth/register` - ユーザー登録
- `POST /api/auth/login` - ログイン
- `POST /api/auth/logout` - ログアウト
- `GET /api/auth/me` - 現在のユーザー情報取得
- `GET /api/auth/profile` - プロフィール取得
- `PUT /api/auth/profile` - プロフィール更新
- `POST /api/auth/forgot-password` - パスワードリセット申請
- `GET /api/auth/reset-password` - パスワードリセットトークン検証
- `POST /api/auth/reset-password` - パスワードリセット実行

### 投稿関連
- `GET /api/posts` - 投稿一覧取得
- `POST /api/posts` - 投稿作成
- `GET /api/posts/[id]` - 投稿詳細取得
- `PUT /api/posts/[id]` - 投稿更新
- `DELETE /api/posts/[id]` - 投稿削除
- `POST /api/posts/[id]/like` - いいね追加/削除
- `GET /api/posts/[id]/like` - いいね状態取得
- `POST /api/posts/[id]/bump` - 投稿を挙げ
- `GET /api/posts/[id]/bump` - 挙げ状態取得

### コメント関連
- `GET /api/posts/[id]/comments` - コメント一覧取得
- `POST /api/posts/[id]/comments` - コメント投稿
- `PUT /api/comments/[id]` - コメント編集
- `DELETE /api/comments/[id]` - コメント削除

### メッセージ関連（DM）
- `GET /api/messages` - 会話一覧取得 / 未読数取得
- `POST /api/messages` - メッセージ送信
- `PUT /api/messages/[id]` - メッセージ編集
- `DELETE /api/messages/[id]` - メッセージ削除
- `POST /api/messages/block` - ユーザーをブロック
- `DELETE /api/messages/block` - ユーザーのブロック解除
- `GET /api/messages/block` - ブロック状態の確認

### グループチャット関連
- `GET /api/group-chats` - グループチャット一覧取得 / 未読数取得
- `POST /api/group-chats` - グループチャット作成
- `PUT /api/group-chats` - グループチャット更新 / 退出
- `GET /api/group-chats/messages` - メッセージ一覧取得
- `POST /api/group-chats/messages` - メッセージ送信
- `PUT /api/group-chats/messages/[id]` - メッセージ編集
- `DELETE /api/group-chats/messages/[id]` - メッセージ削除

### フィードバック関連
- `POST /api/feedback` - フィードバック送信
- `GET /api/feedback/my` - 自分のフィードバック取得
- `POST /api/feedback/[id]/messages` - メッセージ送信
- `GET /api/feedback/notifications` - 通知数取得

### ユーザー関連
- `GET /api/users` - ユーザー一覧取得（ページネーション対応）
- `GET /api/users/[id]` - ユーザー情報取得
- `GET /api/users/search` - ユーザー検索（publicId または username）

### ブックマーク関連
- `GET /api/bookmarks` - ブックマーク一覧取得
- `POST /api/bookmarks` - ブックマーク追加/削除
- `GET /api/bookmarks/count` - ブックマーク数取得

### お知らせ関連
- `GET /api/announcements` - お知らせ一覧取得
- `POST /api/announcements` - お知らせ作成（管理者のみ）
- `PUT /api/announcements` - お知らせ更新（管理者のみ）
- `DELETE /api/announcements` - お知らせ削除（管理者のみ）

### 管理者関連
- `GET /api/admin/check` - 管理者チェック
- `GET /api/admin/feedback` - フィードバック一覧取得
- `DELETE /api/admin/feedback` - フィードバック削除
- `POST /api/admin/feedback/[id]/reply` - 返信送信
- `GET /api/admin/users` - ユーザー一覧取得
- `PUT /api/admin/users` - ユーザー情報更新
- `POST /api/admin/users/[id]/unlock` - アカウントロック解除
- `GET /api/admin/security-logs` - セキュリティログ取得

### Stripe関連
- `GET /api/stripe/config` - Stripe公開キー取得
- `POST /api/stripe/create-checkout` - チェックアウトセッション作成
- `GET /api/stripe/check-session` - セッション状態確認
- `POST /api/stripe/create-portal` - 顧客ポータル作成
- `POST /api/stripe/sync-subscription` - サブスクリプション状態の手動同期
- `POST /api/stripe/webhook` - Stripe Webhook（自動同期）

---

## データモデル

### User（ユーザー）
```typescript
{
  id: string;
  username: string;
  email: string;
  password: string; // bcryptハッシュ
  creatorType: CreatorType;
  bio?: string; // 最大500文字
  portfolioUrls?: string[] | Array<{ url: string; description?: string }>; // 最大3つ、説明は最大100文字
  isActive?: boolean;
  publicId?: string; // 表示用ID（グループチャット用）
  subscription?: Subscription;
  lastBumpAt?: string; // 最後に挙げた時刻（24時間クールタイム管理用）
  failedLoginAttempts?: number; // 連続ログイン失敗回数
  accountLockedUntil?: string; // アカウントロック解除時刻（ISO形式）
  createdAt: string;
}
```

### Subscription（サブスクリプション）
```typescript
{
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  planType: 'free' | 'grow' | 'bloom';
  status: 'active' | 'canceled' | 'past_due' | 'trialing' | 'incomplete';
  currentPeriodEnd?: string;
  cancelAtPeriodEnd?: boolean;
}
```

### Post（投稿）
```typescript
{
  id: string;
  userId: string;
  username: string;
  creatorType: CreatorType;
  type: 'collab' | 'idea' | 'seeking';
  title: string; // 最大100文字
  content: string; // 最大1000文字
  tags: string[]; // 各タグ最大30文字、合計最大200文字
  url?: string; // 後方互換性のため残す
  urls?: string[] | Array<{ url: string; description?: string }>; // 最大3つ、説明は最大100文字
  status: 'open' | 'closed';
  priorityDisplay?: boolean; // 優先表示フラグ（Grow Plan以上）
  featuredDisplay?: boolean; // 注目のアイデア枠（Grow Plan以上）
  likes: string[];
  bumpedAt?: string; // 挙げた時刻（投稿一覧の上位表示用）
  isDeletedByAdmin?: boolean; // 管理者によって削除されたか
  createdAt: string;
  updatedAt: string;
}
```

### Comment（コメント）
```typescript
{
  id: string;
  postId: string;
  userId: string;
  username: string;
  content: string; // 最大500文字
  isDeletedByAdmin?: boolean; // 管理者によって削除されたか
  createdAt: string;
}
```

### Message（DMメッセージ）
```typescript
{
  id: string;
  conversationId: string;
  senderId: string;
  receiverId: string;
  content: string;
  read: boolean;
  createdAt: string;
  updatedAt?: string;
}
```

### Conversation（DM会話）
```typescript
{
  id: string;
  participantIds: string[]; // [userId1, userId2] - 常に2人
  lastMessageId?: string;
  lastMessageAt?: string;
  createdAt: string;
}
```

### GroupChat（グループチャット）
```typescript
{
  id: string;
  name: string;
  description?: string;
  participantIds: string[]; // 参加者IDの配列（2人以上）
  createdBy: string; // 作成者のID
  lastMessageId?: string;
  lastMessageAt?: string;
  createdAt: string;
  updatedAt: string;
}
```

### GroupMessage（グループメッセージ）
```typescript
{
  id: string;
  groupChatId: string;
  senderId: string;
  senderUsername: string;
  content: string;
  readBy: string[]; // 既読したユーザーIDの配列
  createdAt: string;
  updatedAt?: string;
}
```

### Bookmark（ブックマーク）
```typescript
{
  id: string;
  userId: string;
  postId: string;
  createdAt: string;
}
```

### Feedback（フィードバック）
```typescript
{
  id: string;
  name?: string;
  email?: string;
  userId?: string;
  subject: 'feature' | 'bug' | 'improvement' | 'other';
  message: string;
  messages?: FeedbackMessage[];
  reply?: string; // 後方互換性のため残す
  repliedAt?: string;
  repliedBy?: string;
  createdAt: string;
}
```

### FeedbackMessage（フィードバックメッセージ）
```typescript
{
  id: string;
  content: string;
  senderId: string;
  senderType: 'admin' | 'user';
  createdAt: string;
}
```

### Announcement（お知らせ）
```typescript
{
  id: string;
  title: string;
  content: string;
  type: 'emergency' | 'maintenance' | 'info' | 'warning' | 'success';
  isVisible: boolean;
  publishedAt?: string;
  expiresAt?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}
```

### PasswordResetToken（パスワードリセットトークン）
```typescript
{
  id: string;
  userId: string;
  token: string;
  email: string;
  expiresAt: string; // ISO形式
  used: boolean;
  createdAt: string;
}
```

### SecurityLogEntry（セキュリティログ）
```typescript
{
  id: string;
  timestamp: string;
  type: 'login_attempt' | 'login_success' | 'login_failure' | 'rate_limit_exceeded' | 'csrf_failure' | 'admin_action' | 'account_suspended' | 'account_activated' | 'account_locked' | 'password_change' | 'unauthorized_access';
  userId?: string;
  email?: string;
  ip?: string;
  userAgent?: string;
  details?: Record<string, any>;
  severity: 'low' | 'medium' | 'high' | 'critical';
}
```

---

## データストレージ

### ファイルベースストレージ
- `data/users.json` - ユーザーデータ
- `data/posts.json` - 投稿データ
- `data/comments.json` - コメントデータ
- `data/feedback.json` - フィードバックデータ
- `data/messages.json` - DMメッセージデータ
- `data/conversations.json` - DM会話データ
- `data/group-messages.json` - グループメッセージデータ
- `data/group-chats.json` - グループチャットデータ
- `data/bookmarks.json` - ブックマークデータ
- `data/password-reset-tokens.json` - パスワードリセットトークンデータ
- `data/blocked-users.json` - ブロックユーザーデータ
- `data/announcements.json` - お知らせデータ
- `data/security-log.json` - セキュリティログデータ

### クライアント側ストレージ
- `localStorage`:
  - `readReplyIds` - 既読フィードバック返信ID
  - `adminFeedbackLastViewed` - 管理者のフィードバック最終閲覧日時
  - `dmChatViewed` - DM会話の最終閲覧日時
  - `groupChatViewed` - グループチャットの最終閲覧日時

---

## 文字数制限

### 投稿
- **タイトル**: 最大100文字
- **内容**: 最大1000文字
- **タグ**: 各タグ最大30文字、合計最大200文字
- **URL説明**: 最大100文字

### コメント
- **内容**: 最大500文字

### プロフィール
- **ユーザー名**: 最大100文字（推奨）
- **自己紹介**: 最大500文字
- **作品URL説明**: 最大100文字

### その他
- **グループチャット名**: 不適切な言葉フィルタリング
- **グループチャット説明**: 不適切な言葉フィルタリング

---

## バージョン情報

- **アプリケーション名**: Creators Garden（クリエイターズガーデン）
- **バージョン**: 0.1.0
- **最終更新**: 2025年1月
- **セキュリティスコア**: 10/10 ✅

---

## 今後の拡張予定

- データベースへの移行（PostgreSQL/MySQL）
- Redisの導入（レート制限とCSRFトークンの永続化）
- 画像アップロード機能
- 通知システムの強化（プッシュ通知）
- 検索機能の拡張（全文検索）
- ソーシャル機能の追加（フォロー、お気に入りなど）
- 多言語対応

---

## 参考資料

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Next.js Security Best Practices](https://nextjs.org/docs/app/building-your-application/configuring/security-headers)
- [OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
- [Stripe API Documentation](https://stripe.com/docs/api)
