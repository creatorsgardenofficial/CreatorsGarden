export type CreatorType = 'writer' | 'illustrator' | 'mangaArtist' | 'composer' | 'singer' | 'voiceActor' | 'gameCreator' | 'videoCreator' | 'artist3d' | 'live2dModeler' | 'developer' | 'other';

export type PostType = 'collab' | 'idea' | 'seeking';

export type PostStatus = 'open' | 'closed';

export type PlanType = 'free' | 'grow' | 'bloom';

export interface Subscription {
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  planType: PlanType;
  status: 'active' | 'canceled' | 'past_due' | 'trialing' | 'incomplete';
  currentPeriodEnd?: string;
  cancelAtPeriodEnd?: boolean;
}

export interface User {
  id: string;
  username: string;
  email: string;
  password: string;
  creatorType: CreatorType;
  bio?: string;
  portfolioUrls?: string[] | Array<{ url: string; description?: string }>; // 説明付きURL対応
  isActive?: boolean;
  publicId?: string; // 表示用ID（グループチャット用）
  subscription?: Subscription;
  lastBumpAt?: string; // 最後に挙げた時刻（24時間クールタイム管理用）
  failedLoginAttempts?: number; // 連続ログイン失敗回数
  accountLockedUntil?: string; // アカウントロック解除時刻（ISO形式）
  createdAt: string;
}

export interface Post {
  id: string;
  userId: string;
  username: string;
  creatorType: CreatorType;
  type: PostType;
  title: string;
  content: string;
  tags: string[];
  url?: string; // 後方互換性のため残す
  urls?: string[] | Array<{ url: string; description?: string }>; // 複数URL対応（最大3つ）、説明付きURL対応
  status: PostStatus;
  priorityDisplay?: boolean; // 優先表示フラグ（Grow Plan以上）
  featuredDisplay?: boolean; // 注目のアイデア枠（Grow Plan以上）
  likes: string[];
  bumpedAt?: string; // 挙げた時刻（投稿一覧の上位表示用）
  createdAt: string;
  updatedAt: string;
}

export interface Comment {
  id: string;
  postId: string;
  userId: string;
  username: string;
  content: string;
  createdAt: string;
}

export type FeedbackSubject = 'feature' | 'bug' | 'improvement' | 'other';

export interface FeedbackMessage {
  id: string;
  content: string;
  senderId: string; // 送信者のID（管理者またはユーザー）
  senderType: 'admin' | 'user'; // 送信者の種類
  createdAt: string;
}

export interface Feedback {
  id: string;
  name?: string;
  email?: string;
  userId?: string; // ログインユーザーのID（オプショナル）
  subject: FeedbackSubject;
  message: string;
  messages?: FeedbackMessage[]; // メッセージのやり取り
  reply?: string; // 管理者からの返信（後方互換性のため残す）
  repliedAt?: string; // 返信日時（後方互換性のため残す）
  repliedBy?: string; // 返信した管理者のID（後方互換性のため残す）
  createdAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  receiverId: string;
  content: string;
  read: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface Conversation {
  id: string;
  participantIds: string[]; // [userId1, userId2] - 常に2人
  lastMessageId?: string;
  lastMessageAt?: string;
  createdAt: string;
}

export interface GroupMessage {
  id: string;
  groupChatId: string;
  senderId: string;
  senderUsername: string;
  content: string;
  readBy: string[]; // 既読したユーザーIDの配列
  createdAt: string;
  updatedAt?: string;
}

export interface GroupChat {
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

export interface Bookmark {
  id: string;
  userId: string;
  postId: string;
  createdAt: string;
}

export interface PasswordResetToken {
  id: string;
  userId: string;
  token: string;
  email: string;
  expiresAt: string; // ISO形式の日時文字列
  used: boolean;
  createdAt: string;
}

export type AnnouncementType = 'emergency' | 'maintenance' | 'info' | 'warning' | 'success';

export interface Announcement {
  id: string;
  title: string;
  content: string;
  type: AnnouncementType; // お知らせの種類
  isVisible: boolean; // 表示/非表示フラグ
  publishedAt?: string; // 公開日時（ISO形式、オプション）
  expiresAt?: string; // 有効期限（ISO形式、オプション）
  createdBy: string; // 作成者のユーザーID
  createdAt: string;
  updatedAt: string;
}

