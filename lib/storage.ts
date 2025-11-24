import { promises as fs } from 'fs';
import path from 'path';
import { User, Post, Comment, Feedback, Message, Conversation, GroupMessage, GroupChat, Bookmark, PasswordResetToken, Announcement } from '@/types';

const DATA_DIR = path.join(process.cwd(), 'data');

// データディレクトリの初期化
async function ensureDataDir() {
  // データベースを使用する場合は、ファイルシステム操作をスキップ
  const { shouldUseDatabase } = await import('./db');
  if (shouldUseDatabase()) {
    return;
  }
  
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch (error) {
    console.error('Failed to create data directory:', error);
  }
}

// ファイルパス
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const POSTS_FILE = path.join(DATA_DIR, 'posts.json');
const COMMENTS_FILE = path.join(DATA_DIR, 'comments.json');
const FEEDBACK_FILE = path.join(DATA_DIR, 'feedback.json');
const MESSAGES_FILE = path.join(DATA_DIR, 'messages.json');
const CONVERSATIONS_FILE = path.join(DATA_DIR, 'conversations.json');
const GROUP_MESSAGES_FILE = path.join(DATA_DIR, 'group-messages.json');
const GROUP_CHATS_FILE = path.join(DATA_DIR, 'group-chats.json');
const BOOKMARKS_FILE = path.join(DATA_DIR, 'bookmarks.json');
const PASSWORD_RESET_TOKENS_FILE = path.join(DATA_DIR, 'password-reset-tokens.json');
const BLOCKED_USERS_FILE = path.join(DATA_DIR, 'blocked-users.json');
const ANNOUNCEMENTS_FILE = path.join(DATA_DIR, 'announcements.json');

// ユーザー管理
export async function getUsers(): Promise<User[]> {
  // データベースが利用可能な場合はデータベースを使用
  const { shouldUseDatabase } = await import('./db');
  if (shouldUseDatabase()) {
    const { getUsers: getUsersDb } = await import('./storage-db');
    return getUsersDb();
  }
  
  // ファイルシステムを使用する場合のみディレクトリを作成
  await ensureDataDir();
  try {
    const data = await fs.readFile(USERS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export async function saveUsers(users: User[]): Promise<void> {
  // データベースを使用する場合は、この関数を呼び出さない（storage-dbを使用）
  const { shouldUseDatabase } = await import('./db');
  if (shouldUseDatabase()) {
    throw new Error('saveUsers should not be called when using database. Use storage-db functions instead.');
  }
  
  // Vercelの本番環境ではファイルシステムへの書き込みができない
  const isVercelProduction = process.env.VERCEL === '1' || process.env.VERCEL_ENV === 'production';
  
  if (isVercelProduction) {
    const error = new Error('File system is read-only in Vercel production. Database storage is required.');
    console.error('Cannot write to file system in Vercel production environment.');
    console.error('Error details:', {
      VERCEL: process.env.VERCEL,
      VERCEL_ENV: process.env.VERCEL_ENV,
      NODE_ENV: process.env.NODE_ENV,
    });
    throw error;
  }
  
  await ensureDataDir();
  try {
    await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
  } catch (error: any) {
    console.error('Failed to save users:', error);
    console.error('Error details:', {
      code: error?.code,
      message: error?.message,
      stack: error?.stack,
    });
    // Vercelの本番環境ではファイルシステムへの書き込みができない
    if (error?.code === 'EACCES' || error?.code === 'EROFS' || error?.message?.includes('read-only')) {
      throw new Error('File system is read-only. Database storage is required in production environment.');
    }
    throw error;
  }
}

export async function getUserById(id: string): Promise<User | null> {
  const { shouldUseDatabase } = await import('./db');
  if (shouldUseDatabase()) {
    const { getUserById: getUserByIdDb } = await import('./storage-db');
    return getUserByIdDb(id);
  }
  
  const users = await getUsers();
  return users.find(u => u.id === id) || null;
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const { shouldUseDatabase } = await import('./db');
  if (shouldUseDatabase()) {
    const { getUserByEmail: getUserByEmailDb } = await import('./storage-db');
    return getUserByEmailDb(email);
  }
  
  const users = await getUsers();
  return users.find(u => u.email === email) || null;
}

// ランダムな表示用IDを生成（8文字の英数字）
function generatePublicId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// 既存のpublicIdと重複しないIDを生成
async function generateUniquePublicId(): Promise<string> {
  const users = await getUsers();
  let publicId: string;
  let attempts = 0;
  do {
    publicId = generatePublicId();
    attempts++;
    if (attempts > 100) {
      // フォールバック: タイムスタンプベース
      publicId = Date.now().toString(36).toUpperCase().slice(-8);
      break;
    }
  } while (users.some(u => u.publicId === publicId));
  return publicId;
}

export async function createUser(user: Omit<User, 'id' | 'createdAt' | 'publicId'>): Promise<User> {
  const { shouldUseDatabase } = await import('./db');
  if (shouldUseDatabase()) {
    const { createUser: createUserDb } = await import('./storage-db');
    return createUserDb(user);
  }
  
  // ファイルシステムを使用する場合のみ
  const users = await getUsers();
  const publicId = await generateUniquePublicId();
  const newUser: User = {
    ...user,
    isActive: user.isActive !== undefined ? user.isActive : true, // デフォルトで有効
    publicId,
    subscription: user.subscription || {
      planType: 'free',
      status: 'active',
    }, // デフォルトで無料プラン
    id: Date.now().toString(),
    createdAt: new Date().toISOString(),
  };
  users.push(newUser);
  await saveUsers(users);
  return newUser;
}

export async function updateUser(id: string, updates: Partial<User>): Promise<User | null> {
  const { shouldUseDatabase } = await import('./db');
  if (shouldUseDatabase()) {
    const { updateUser: updateUserDb } = await import('./storage-db');
    return updateUserDb(id, updates);
  }
  
  const users = await getUsers();
  const index = users.findIndex(u => u.id === id);
  if (index === -1) return null;
  
  // subscriptionオブジェクトを正しくマージする
  if (updates.subscription) {
    // 既存のsubscriptionがある場合はマージ、ない場合は新規作成
    if (users[index].subscription) {
      updates.subscription = {
        ...users[index].subscription,
        ...updates.subscription,
      };
    } else {
      // subscriptionが存在しない場合は、デフォルト値とマージ
      // updates.subscriptionにplanTypeが含まれていない場合のみデフォルト値を設定
      const defaultSubscription = {
        planType: 'free' as const,
        status: 'active' as const,
      };
      updates.subscription = {
        ...defaultSubscription,
        ...updates.subscription,
      };
    }
  }
  
  users[index] = {
    ...users[index],
    ...updates,
  };
  
  // ユーザー情報を更新
  
  await saveUsers(users);
  return users[index];
}

// 投稿管理
export async function getPosts(): Promise<Post[]> {
  await ensureDataDir();
  try {
    const data = await fs.readFile(POSTS_FILE, 'utf-8');
    const posts = JSON.parse(data);
    // 既存の投稿にlikesフィールドがない場合は空配列を設定
    // priorityDisplayとfeaturedDisplayもデフォルト値を設定
    return posts.map((post: Post) => ({
      ...post,
      likes: post.likes || [],
      priorityDisplay: post.priorityDisplay || false,
      featuredDisplay: post.featuredDisplay || false,
    }));
  } catch {
    return [];
  }
}

export async function savePosts(posts: Post[]): Promise<void> {
  await ensureDataDir();
  await fs.writeFile(POSTS_FILE, JSON.stringify(posts, null, 2), 'utf-8');
}

export async function getPostById(id: string): Promise<Post | null> {
  const posts = await getPosts();
  return posts.find(p => p.id === id) || null;
}

export async function createPost(post: Omit<Post, 'id' | 'createdAt' | 'updatedAt' | 'likes'>): Promise<Post> {
  const posts = await getPosts();
  const now = new Date().toISOString();
  
  // 投稿者のプラン情報を取得して優先表示フラグを設定
  const user = await getUserById(post.userId);
  const planType = user?.subscription?.planType || 'free';
  const isActive = user?.subscription?.status === 'active';
  
  const newPost: Post = {
    ...post,
    status: post.status || 'open', // デフォルトでopen
    likes: [], // いいねは空配列で初期化
    priorityDisplay: (planType === 'grow' || planType === 'bloom') && isActive, // Grow Plan以上でアクティブな場合
    featuredDisplay: (planType === 'grow' || planType === 'bloom') && isActive, // Grow Plan以上でアクティブな場合
    id: Date.now().toString(),
    createdAt: now,
    updatedAt: now,
  };
  posts.unshift(newPost); // 新しい投稿を先頭に追加
  await savePosts(posts);
  return newPost;
}

export async function updatePost(id: string, updates: Partial<Post>): Promise<Post | null> {
  const posts = await getPosts();
  const index = posts.findIndex(p => p.id === id);
  if (index === -1) return null;
  
  // 投稿者のプラン情報を取得して優先表示フラグを更新
  const user = await getUserById(posts[index].userId);
  const planType = user?.subscription?.planType || 'free';
  const isActive = user?.subscription?.status === 'active';
  
  posts[index] = {
    ...posts[index],
    ...updates,
    priorityDisplay: (planType === 'grow' || planType === 'bloom') && isActive, // Grow Plan以上でアクティブな場合
    featuredDisplay: (planType === 'grow' || planType === 'bloom') && isActive, // Grow Plan以上でアクティブな場合
    updatedAt: new Date().toISOString(),
  };
  await savePosts(posts);
  return posts[index];
}

export async function togglePostLike(postId: string, userIdOrSessionId: string): Promise<Post | null> {
  const posts = await getPosts();
  const index = posts.findIndex(p => p.id === postId);
  if (index === -1) return null;
  
  const post = posts[index];
  const likes = post.likes || [];
  const likeIndex = likes.indexOf(userIdOrSessionId);
  
  if (likeIndex === -1) {
    // いいねを追加
    likes.push(userIdOrSessionId);
  } else {
    // いいねを削除
    likes.splice(likeIndex, 1);
  }
  
  posts[index] = {
    ...post,
    likes,
    updatedAt: new Date().toISOString(),
  };
  
  await savePosts(posts);
  return posts[index];
}

export async function deletePost(id: string): Promise<boolean> {
  const posts = await getPosts();
  const filtered = posts.filter(p => p.id !== id);
  if (filtered.length === posts.length) return false;
  await savePosts(filtered);
  return true;
}

/**
 * 管理者による投稿削除（メッセージを残す）
 * @param id 投稿ID
 * @returns 削除成功時true
 */
export async function adminDeletePost(id: string): Promise<boolean> {
  const posts = await getPosts();
  const index = posts.findIndex(p => p.id === id);
  if (index === -1) return false;
  
  // 内容を削除メッセージに置き換え
  posts[index] = {
    ...posts[index],
    title: '[削除されました]',
    content: '管理者が不適切とみなしたため、削除いたしました。',
    tags: [],
    urls: undefined,
    url: undefined,
    updatedAt: new Date().toISOString(),
  };
  
  await savePosts(posts);
  return true;
}

export async function updatePostsByUserId(userId: string, updates: Partial<Post>): Promise<number> {
  const posts = await getPosts();
  let updatedCount = 0;
  const now = new Date().toISOString();
  
  for (let i = 0; i < posts.length; i++) {
    if (posts[i].userId === userId) {
      posts[i] = {
        ...posts[i],
        ...updates,
        updatedAt: now,
      };
      updatedCount++;
    }
  }
  
  if (updatedCount > 0) {
    await savePosts(posts);
  }
  
  return updatedCount;
}

/**
 * ユーザーの最近の投稿を取得（スパム対策用）
 * @param userId ユーザーID
 * @param minutes 何分以内の投稿を取得するか（デフォルト: 60分）
 * @param limit 取得件数の上限（デフォルト: 10件）
 * @returns 最近の投稿の配列
 */
export async function getRecentPostsByUserId(userId: string, minutes: number = 60, limit: number = 10): Promise<Post[]> {
  const posts = await getPosts();
  const now = Date.now();
  const timeLimit = minutes * 60 * 1000;
  
  return posts
    .filter(post => {
      if (post.userId !== userId) return false;
      const postTime = new Date(post.createdAt).getTime();
      return (now - postTime) <= timeLimit;
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);
}

/**
 * ユーザーの最近のコメントを取得（スパム対策用）
 * @param userId ユーザーID
 * @param minutes 何分以内のコメントを取得するか（デフォルト: 60分）
 * @param limit 取得件数の上限（デフォルト: 20件）
 * @returns 最近のコメントの配列
 */
export async function getRecentCommentsByUserId(userId: string, minutes: number = 60, limit: number = 20): Promise<Comment[]> {
  const comments = await getComments();
  const now = Date.now();
  const timeLimit = minutes * 60 * 1000;
  
  return comments
    .filter(comment => {
      if (comment.userId !== userId) return false;
      const commentTime = new Date(comment.createdAt).getTime();
      return (now - commentTime) <= timeLimit;
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);
}

// コメント管理
export async function getComments(): Promise<Comment[]> {
  await ensureDataDir();
  try {
    const data = await fs.readFile(COMMENTS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export async function saveComments(comments: Comment[]): Promise<void> {
  await ensureDataDir();
  await fs.writeFile(COMMENTS_FILE, JSON.stringify(comments, null, 2), 'utf-8');
}

export async function getCommentsByPostId(postId: string): Promise<Comment[]> {
  const comments = await getComments();
  return comments.filter(c => c.postId === postId).sort((a, b) => 
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
}

export async function createComment(comment: Omit<Comment, 'id' | 'createdAt'>): Promise<Comment> {
  const comments = await getComments();
  const newComment: Comment = {
    ...comment,
    id: Date.now().toString(),
    createdAt: new Date().toISOString(),
  };
  comments.push(newComment);
  await saveComments(comments);
  return newComment;
}

export async function getCommentById(id: string): Promise<Comment | null> {
  const comments = await getComments();
  return comments.find(c => c.id === id) || null;
}

export async function updateComment(id: string, updates: Partial<Comment>): Promise<Comment | null> {
  const comments = await getComments();
  const index = comments.findIndex(c => c.id === id);
  if (index === -1) return null;
  
  comments[index] = {
    ...comments[index],
    ...updates,
  };
  await saveComments(comments);
  return comments[index];
}

export async function deleteComment(id: string): Promise<boolean> {
  const comments = await getComments();
  const filtered = comments.filter(c => c.id !== id);
  if (filtered.length === comments.length) return false;
  await saveComments(filtered);
  return true;
}

/**
 * 管理者によるコメント削除（メッセージを残す）
 * @param id コメントID
 * @returns 削除成功時true
 */
export async function adminDeleteComment(id: string): Promise<boolean> {
  const comments = await getComments();
  const index = comments.findIndex(c => c.id === id);
  if (index === -1) return false;
  
  // 内容を削除メッセージに置き換え
  comments[index] = {
    ...comments[index],
    content: '管理者が不適切とみなしたため、削除いたしました。',
  };
  
  await saveComments(comments);
  return true;
}

// フィードバック管理
export async function getFeedbacks(): Promise<Feedback[]> {
  await ensureDataDir();
  try {
    const data = await fs.readFile(FEEDBACK_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export async function saveFeedbacks(feedbacks: Feedback[]): Promise<void> {
  await ensureDataDir();
  await fs.writeFile(FEEDBACK_FILE, JSON.stringify(feedbacks, null, 2), 'utf-8');
}

export async function createFeedback(feedback: Omit<Feedback, 'id' | 'createdAt'>): Promise<Feedback> {
  const feedbacks = await getFeedbacks();
  const newFeedback: Feedback = {
    ...feedback,
    id: Date.now().toString(),
    createdAt: new Date().toISOString(),
  };
  feedbacks.unshift(newFeedback); // 新しいフィードバックを先頭に追加
  await saveFeedbacks(feedbacks);
  return newFeedback;
}

export async function getFeedbackById(id: string): Promise<Feedback | null> {
  const feedbacks = await getFeedbacks();
  return feedbacks.find(f => f.id === id) || null;
}

export async function updateFeedback(id: string, updates: Partial<Feedback>): Promise<Feedback | null> {
  const feedbacks = await getFeedbacks();
  const index = feedbacks.findIndex(f => f.id === id);
  if (index === -1) return null;
  
  feedbacks[index] = {
    ...feedbacks[index],
    ...updates,
  };
  await saveFeedbacks(feedbacks);
  return feedbacks[index];
}

export async function deleteFeedback(id: string): Promise<boolean> {
  const feedbacks = await getFeedbacks();
  const filtered = feedbacks.filter(f => f.id !== id);
  if (filtered.length === feedbacks.length) return false;
  await saveFeedbacks(filtered);
  return true;
}

// メッセージ管理
export async function getMessages(): Promise<Message[]> {
  await ensureDataDir();
  try {
    const data = await fs.readFile(MESSAGES_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export async function saveMessages(messages: Message[]): Promise<void> {
  await ensureDataDir();
  await fs.writeFile(MESSAGES_FILE, JSON.stringify(messages, null, 2), 'utf-8');
}

export async function getMessagesByConversationId(conversationId: string): Promise<Message[]> {
  const messages = await getMessages();
  return messages.filter(m => m.conversationId === conversationId).sort((a, b) => 
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
}

export async function createMessage(message: Omit<Message, 'id' | 'createdAt' | 'read'>): Promise<Message> {
  const messages = await getMessages();
  const newMessage: Message = {
    ...message,
    id: Date.now().toString(),
    read: false,
    createdAt: new Date().toISOString(),
  };
  messages.push(newMessage);
  await saveMessages(messages);
  return newMessage;
}

export async function markMessagesAsRead(conversationId: string, userId: string): Promise<void> {
  const messages = await getMessages();
  const updated = messages.map(m => {
    if (m.conversationId === conversationId && m.receiverId === userId && !m.read) {
      return { ...m, read: true };
    }
    return m;
  });
  await saveMessages(updated);
}

export async function getUnreadMessageCount(userId: string): Promise<number> {
  const messages = await getMessages();
  return messages.filter(m => m.receiverId === userId && !m.read).length;
}

export async function getMessageById(id: string): Promise<Message | null> {
  const messages = await getMessages();
  return messages.find(m => m.id === id) || null;
}

export async function updateMessage(id: string, updates: Partial<Message>): Promise<Message | null> {
  const messages = await getMessages();
  const index = messages.findIndex(m => m.id === id);
  if (index === -1) return null;
  
  messages[index] = {
    ...messages[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  await saveMessages(messages);
  return messages[index];
}

export async function deleteMessage(id: string): Promise<boolean> {
  const messages = await getMessages();
  const filtered = messages.filter(m => m.id !== id);
  if (filtered.length === messages.length) return false;
  await saveMessages(filtered);
  return true;
}

// 会話管理
export async function getConversations(): Promise<Conversation[]> {
  await ensureDataDir();
  try {
    const data = await fs.readFile(CONVERSATIONS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export async function saveConversations(conversations: Conversation[]): Promise<void> {
  await ensureDataDir();
  await fs.writeFile(CONVERSATIONS_FILE, JSON.stringify(conversations, null, 2), 'utf-8');
}

export async function getConversationByParticipants(userId1: string, userId2: string): Promise<Conversation | null> {
  const conversations = await getConversations();
  return conversations.find(c => {
    const ids = c.participantIds.sort();
    const searchIds = [userId1, userId2].sort();
    return ids[0] === searchIds[0] && ids[1] === searchIds[1];
  }) || null;
}

export async function getConversationsByUserId(userId: string): Promise<Conversation[]> {
  const conversations = await getConversations();
  return conversations.filter(c => c.participantIds.includes(userId)).sort((a, b) => {
    const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : new Date(a.createdAt).getTime();
    const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : new Date(b.createdAt).getTime();
    return bTime - aTime; // 新しい順
  });
}

export async function createConversation(participantIds: [string, string]): Promise<Conversation> {
  const conversations = await getConversations();
  const newConversation: Conversation = {
    id: Date.now().toString(),
    participantIds: participantIds.sort(),
    createdAt: new Date().toISOString(),
  };
  conversations.push(newConversation);
  await saveConversations(conversations);
  return newConversation;
}

export async function updateConversation(conversationId: string, updates: Partial<Conversation>): Promise<Conversation | null> {
  const conversations = await getConversations();
  const index = conversations.findIndex(c => c.id === conversationId);
  if (index === -1) return null;
  conversations[index] = { ...conversations[index], ...updates };
  await saveConversations(conversations);
  return conversations[index];
}

// 表示用IDでユーザーを検索
export async function getUserByPublicId(publicId: string): Promise<User | null> {
  const { shouldUseDatabase } = await import('./db');
  if (shouldUseDatabase()) {
    const { getUserByPublicId: getUserByPublicIdDb } = await import('./storage-db');
    return getUserByPublicIdDb(publicId);
  }
  
  const users = await getUsers();
  return users.find(u => u.publicId === publicId && u.isActive !== false) || null;
}

// ブックマーク管理
export async function getBookmarks(): Promise<Bookmark[]> {
  await ensureDataDir();
  try {
    const data = await fs.readFile(BOOKMARKS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export async function saveBookmarks(bookmarks: Bookmark[]): Promise<void> {
  await ensureDataDir();
  await fs.writeFile(BOOKMARKS_FILE, JSON.stringify(bookmarks, null, 2), 'utf-8');
}

export async function createBookmark(userId: string, postId: string): Promise<Bookmark> {
  const bookmarks = await getBookmarks();
  
  // 既にブックマークされているかチェック
  const existing = bookmarks.find(b => b.userId === userId && b.postId === postId);
  if (existing) {
    return existing;
  }
  
  const newBookmark: Bookmark = {
    id: Date.now().toString(),
    userId,
    postId,
    createdAt: new Date().toISOString(),
  };
  
  bookmarks.push(newBookmark);
  await saveBookmarks(bookmarks);
  return newBookmark;
}

export async function deleteBookmark(userId: string, postId: string): Promise<boolean> {
  const bookmarks = await getBookmarks();
  const filtered = bookmarks.filter(b => !(b.userId === userId && b.postId === postId));
  
  if (filtered.length === bookmarks.length) {
    return false; // ブックマークが見つからなかった
  }
  
  await saveBookmarks(filtered);
  return true;
}

export async function getBookmarksByUserId(userId: string): Promise<Bookmark[]> {
  const bookmarks = await getBookmarks();
  return bookmarks.filter(b => b.userId === userId);
}

export async function getBookmarkCount(userId: string): Promise<number> {
  const bookmarks = await getBookmarks();
  return bookmarks.filter(b => b.userId === userId).length;
}

export async function isBookmarked(userId: string, postId: string): Promise<boolean> {
  const bookmarks = await getBookmarks();
  return bookmarks.some(b => b.userId === userId && b.postId === postId);
}

export async function getBookmarkedPostIds(userId: string): Promise<string[]> {
  const bookmarks = await getBookmarks();
  return bookmarks
    .filter(b => b.userId === userId)
    .map(b => b.postId);
}

// 既存ユーザーに表示用IDを付与（マイグレーション用）
export async function assignPublicIdsToExistingUsers(): Promise<number> {
  const users = await getUsers();
  let updatedCount = 0;
  const existingPublicIds = new Set(users.map(u => u.publicId).filter(Boolean));
  
  for (let i = 0; i < users.length; i++) {
    if (!users[i].publicId) {
      let publicId: string;
      let attempts = 0;
      do {
        publicId = generatePublicId();
        attempts++;
        if (attempts > 100) {
          // フォールバック: タイムスタンプベース
          publicId = Date.now().toString(36).toUpperCase().slice(-8) + i.toString();
          break;
        }
      } while (existingPublicIds.has(publicId));
      
      users[i].publicId = publicId;
      existingPublicIds.add(publicId);
      updatedCount++;
    }
  }
  if (updatedCount > 0) {
    await saveUsers(users);
  }
  return updatedCount;
}

// グループメッセージ管理
export async function getGroupMessages(): Promise<GroupMessage[]> {
  await ensureDataDir();
  try {
    const data = await fs.readFile(GROUP_MESSAGES_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export async function saveGroupMessages(messages: GroupMessage[]): Promise<void> {
  await ensureDataDir();
  await fs.writeFile(GROUP_MESSAGES_FILE, JSON.stringify(messages, null, 2), 'utf-8');
}

export async function getGroupMessagesByGroupChatId(groupChatId: string): Promise<GroupMessage[]> {
  const messages = await getGroupMessages();
  return messages.filter(m => m.groupChatId === groupChatId).sort((a, b) => 
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
}

export async function createGroupMessage(message: Omit<GroupMessage, 'id' | 'createdAt' | 'readBy'>): Promise<GroupMessage> {
  const messages = await getGroupMessages();
  const newMessage: GroupMessage = {
    ...message,
    id: Date.now().toString(),
    readBy: [message.senderId], // 送信者は自動的に既読
    createdAt: new Date().toISOString(),
  };
  messages.push(newMessage);
  await saveGroupMessages(messages);
  return newMessage;
}

export async function markGroupMessageAsRead(messageId: string, userId: string): Promise<void> {
  const messages = await getGroupMessages();
  const updated = messages.map(m => {
    if (m.id === messageId && !m.readBy.includes(userId)) {
      return { ...m, readBy: [...m.readBy, userId] };
    }
    return m;
  });
  await saveGroupMessages(updated);
}

export async function getGroupMessageById(id: string): Promise<GroupMessage | null> {
  const messages = await getGroupMessages();
  return messages.find(m => m.id === id) || null;
}

export async function updateGroupMessage(id: string, updates: Partial<GroupMessage>): Promise<GroupMessage | null> {
  const messages = await getGroupMessages();
  const index = messages.findIndex(m => m.id === id);
  if (index === -1) return null;
  
  messages[index] = {
    ...messages[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  await saveGroupMessages(messages);
  return messages[index];
}

export async function deleteGroupMessage(id: string): Promise<boolean> {
  const messages = await getGroupMessages();
  const filtered = messages.filter(m => m.id !== id);
  if (filtered.length === messages.length) return false;
  await saveGroupMessages(filtered);
  return true;
}

// グループチャット管理
export async function getGroupChats(): Promise<GroupChat[]> {
  await ensureDataDir();
  try {
    const data = await fs.readFile(GROUP_CHATS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export async function saveGroupChats(groupChats: GroupChat[]): Promise<void> {
  await ensureDataDir();
  await fs.writeFile(GROUP_CHATS_FILE, JSON.stringify(groupChats, null, 2), 'utf-8');
}

export async function getGroupChatById(id: string): Promise<GroupChat | null> {
  const groupChats = await getGroupChats();
  return groupChats.find(gc => gc.id === id) || null;
}

export async function getGroupChatsByUserId(userId: string): Promise<GroupChat[]> {
  const groupChats = await getGroupChats();
  return groupChats.filter(gc => gc.participantIds.includes(userId)).sort((a, b) => {
    const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : new Date(a.createdAt).getTime();
    const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : new Date(b.createdAt).getTime();
    return bTime - aTime; // 新しい順
  });
}

export async function createGroupChat(groupChat: Omit<GroupChat, 'id' | 'createdAt' | 'updatedAt'>): Promise<GroupChat> {
  const groupChats = await getGroupChats();
  const now = new Date().toISOString();
  const newGroupChat: GroupChat = {
    ...groupChat,
    id: Date.now().toString(),
    createdAt: now,
    updatedAt: now,
  };
  groupChats.push(newGroupChat);
  await saveGroupChats(groupChats);
  return newGroupChat;
}

export async function updateGroupChat(id: string, updates: Partial<GroupChat>): Promise<GroupChat | null> {
  const groupChats = await getGroupChats();
  const index = groupChats.findIndex(gc => gc.id === id);
  if (index === -1) return null;
  groupChats[index] = {
    ...groupChats[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  await saveGroupChats(groupChats);
  return groupChats[index];
}

export async function addParticipantToGroupChat(groupChatId: string, userId: string): Promise<GroupChat | null> {
  const groupChat = await getGroupChatById(groupChatId);
  if (!groupChat) return null;
  if (groupChat.participantIds.includes(userId)) return groupChat; // 既に参加している
  return updateGroupChat(groupChatId, {
    participantIds: [...groupChat.participantIds, userId],
  });
}

export async function removeParticipantFromGroupChat(groupChatId: string, userId: string): Promise<GroupChat | null> {
  const groupChat = await getGroupChatById(groupChatId);
  if (!groupChat) return null;
  return updateGroupChat(groupChatId, {
    participantIds: groupChat.participantIds.filter(id => id !== userId),
  });
}

// パスワードリセットトークン管理
export async function getPasswordResetTokens(): Promise<PasswordResetToken[]> {
  await ensureDataDir();
  try {
    const data = await fs.readFile(PASSWORD_RESET_TOKENS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export async function savePasswordResetTokens(tokens: PasswordResetToken[]): Promise<void> {
  await ensureDataDir();
  await fs.writeFile(PASSWORD_RESET_TOKENS_FILE, JSON.stringify(tokens, null, 2), 'utf-8');
}

export async function createPasswordResetToken(userId: string, email: string, token: string, expiresInHours: number = 24): Promise<PasswordResetToken> {
  const tokens = await getPasswordResetTokens();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + expiresInHours * 60 * 60 * 1000);
  
  const resetToken: PasswordResetToken = {
    id: Date.now().toString(),
    userId,
    token,
    email,
    expiresAt: expiresAt.toISOString(),
    used: false,
    createdAt: now.toISOString(),
  };
  
  tokens.push(resetToken);
  await savePasswordResetTokens(tokens);
  return resetToken;
}

export async function getPasswordResetTokenByToken(token: string): Promise<PasswordResetToken | null> {
  const tokens = await getPasswordResetTokens();
  const resetToken = tokens.find(t => t.token === token && !t.used);
  
  if (!resetToken) return null;
  
  // 有効期限チェック
  const expiresAt = new Date(resetToken.expiresAt);
  if (expiresAt < new Date()) {
    return null; // 期限切れ
  }
  
  return resetToken;
}

export async function markPasswordResetTokenAsUsed(token: string): Promise<void> {
  const tokens = await getPasswordResetTokens();
  const index = tokens.findIndex(t => t.token === token);
  
  if (index !== -1) {
    tokens[index].used = true;
    await savePasswordResetTokens(tokens);
  }
}

export async function deleteExpiredPasswordResetTokens(): Promise<void> {
  const tokens = await getPasswordResetTokens();
  const now = new Date();
  const validTokens = tokens.filter(t => {
    const expiresAt = new Date(t.expiresAt);
    return expiresAt >= now && !t.used;
  });
  
  if (validTokens.length !== tokens.length) {
    await savePasswordResetTokens(validTokens);
  }
}

// ブロックリスト管理
interface BlockedUser {
  userId: string; // ブロックしたユーザーID
  blockedUserId: string; // ブロックされたユーザーID
  createdAt: string;
}

export async function getBlockedUsers(): Promise<BlockedUser[]> {
  await ensureDataDir();
  try {
    const data = await fs.readFile(BLOCKED_USERS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export async function saveBlockedUsers(blockedUsers: BlockedUser[]): Promise<void> {
  await ensureDataDir();
  await fs.writeFile(BLOCKED_USERS_FILE, JSON.stringify(blockedUsers, null, 2), 'utf-8');
}

export async function getBlockedUserIds(userId: string): Promise<string[]> {
  const blockedUsers = await getBlockedUsers();
  return blockedUsers
    .filter(bu => bu.userId === userId)
    .map(bu => bu.blockedUserId);
}

export async function isUserBlocked(userId: string, blockedUserId: string): Promise<boolean> {
  const blockedUsers = await getBlockedUsers();
  return blockedUsers.some(bu => bu.userId === userId && bu.blockedUserId === blockedUserId);
}

export async function blockUser(userId: string, blockedUserId: string): Promise<void> {
  const blockedUsers = await getBlockedUsers();
  
  // 既にブロックされているかチェック
  const alreadyBlocked = blockedUsers.some(bu => bu.userId === userId && bu.blockedUserId === blockedUserId);
  if (alreadyBlocked) {
    return; // 既にブロック済み
  }
  
  const newBlock: BlockedUser = {
    userId,
    blockedUserId,
    createdAt: new Date().toISOString(),
  };
  
  blockedUsers.push(newBlock);
  await saveBlockedUsers(blockedUsers);
}

export async function unblockUser(userId: string, blockedUserId: string): Promise<void> {
  const blockedUsers = await getBlockedUsers();
  const filtered = blockedUsers.filter(
    bu => !(bu.userId === userId && bu.blockedUserId === blockedUserId)
  );
  
  if (filtered.length !== blockedUsers.length) {
    await saveBlockedUsers(filtered);
  }
}

// お知らせ管理
export async function getAnnouncements(): Promise<Announcement[]> {
  await ensureDataDir();
  try {
    const data = await fs.readFile(ANNOUNCEMENTS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export async function saveAnnouncements(announcements: Announcement[]): Promise<void> {
  await ensureDataDir();
  await fs.writeFile(ANNOUNCEMENTS_FILE, JSON.stringify(announcements, null, 2), 'utf-8');
}

export async function getVisibleAnnouncements(): Promise<Announcement[]> {
  const announcements = await getAnnouncements();
  const now = new Date();
  
  return announcements
    .map(announcement => ({
      ...announcement,
      type: announcement.type || 'info', // 既存データの互換性のため
    }))
    .filter(announcement => {
      // 表示フラグがtrue
      if (!announcement.isVisible) return false;
      
      // 公開日時が設定されている場合、現在時刻より後なら非表示
      if (announcement.publishedAt) {
        const publishedAt = new Date(announcement.publishedAt);
        if (publishedAt > now) return false;
      }
      
      // 有効期限が設定されている場合、現在時刻より前なら非表示
      if (announcement.expiresAt) {
        const expiresAt = new Date(announcement.expiresAt);
        if (expiresAt < now) return false;
      }
      
      return true;
    })
    .sort((a, b) => {
      // 最新順にソート（公開日時または作成日時で）
      const dateA = a.publishedAt ? new Date(a.publishedAt).getTime() : new Date(a.createdAt).getTime();
      const dateB = b.publishedAt ? new Date(b.publishedAt).getTime() : new Date(b.createdAt).getTime();
      return dateB - dateA;
    });
}

export async function getAnnouncementById(id: string): Promise<Announcement | null> {
  const announcements = await getAnnouncements();
  return announcements.find(a => a.id === id) || null;
}

export async function createAnnouncement(announcement: Omit<Announcement, 'id' | 'createdAt' | 'updatedAt'>): Promise<Announcement> {
  const announcements = await getAnnouncements();
  const now = new Date().toISOString();
  
  const newAnnouncement: Announcement = {
    ...announcement,
    type: announcement.type || 'info',
    id: Date.now().toString(),
    createdAt: now,
    updatedAt: now,
  };
  
  announcements.push(newAnnouncement);
  await saveAnnouncements(announcements);
  return newAnnouncement;
}

export async function updateAnnouncement(id: string, updates: Partial<Announcement>): Promise<Announcement | null> {
  const announcements = await getAnnouncements();
  const index = announcements.findIndex(a => a.id === id);
  
  if (index === -1) {
    return null;
  }
  
  announcements[index] = {
    ...announcements[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  
  await saveAnnouncements(announcements);
  return announcements[index];
}

export async function deleteAnnouncement(id: string): Promise<boolean> {
  const announcements = await getAnnouncements();
  const filtered = announcements.filter(a => a.id !== id);
  
  if (filtered.length === announcements.length) {
    return false; // 削除対象が見つからなかった
  }
  
  await saveAnnouncements(filtered);
  return true;
}

