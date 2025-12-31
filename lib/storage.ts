import { promises as fs } from 'fs';
import path from 'path';
import { User, Post, Comment, Feedback, Message, Conversation, GroupMessage, GroupChat, Bookmark, PasswordResetToken, Announcement } from '@/types';
import { shouldUseDatabaseStorage, isVercelProduction, throwDatabaseRequiredError } from './storage-common';

const DATA_DIR = path.join(process.cwd(), 'data');

// データディレクトリの初期化
async function ensureDataDir() {
  // データベースを使用する場合は、ファイルシステム操作をスキップ
  if (await shouldUseDatabaseStorage()) {
    return;
  }
  
  // Vercelの本番環境ではファイルシステムへの書き込みができない
  if (isVercelProduction()) {
    return; // 本番環境ではスキップ
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
  if (await shouldUseDatabaseStorage()) {
    const { getUsers: getUsersDb } = await import('./storage-db');
    return getUsersDb();
  }
  
  // Vercelの本番環境ではファイルシステムを使用できない
  if (isVercelProduction()) {
    throwDatabaseRequiredError();
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
  if (await shouldUseDatabaseStorage()) {
    throw new Error('saveUsers should not be called when using database. Use storage-db functions instead.');
  }
  
  // Vercelの本番環境ではファイルシステムへの書き込みができない
  if (isVercelProduction()) {
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
  if (await shouldUseDatabaseStorage()) {
    const { getUserById: getUserByIdDb } = await import('./storage-db');
    return getUserByIdDb(id);
  }
  
  if (isVercelProduction()) {
    throwDatabaseRequiredError();
  }
  
  const users = await getUsers();
  return users.find(u => u.id === id) || null;
}

export async function getUserByEmail(email: string): Promise<User | null> {
  if (await shouldUseDatabaseStorage()) {
    const { getUserByEmail: getUserByEmailDb } = await import('./storage-db');
    return getUserByEmailDb(email);
  }
  
  if (isVercelProduction()) {
    throwDatabaseRequiredError();
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

// 退会処理
export async function deactivateUser(userId: string, reason?: string): Promise<User | null> {
  const { shouldUseDatabase } = await import('./db');
  if (shouldUseDatabase()) {
    const { deactivateUser: deactivateUserDb } = await import('./storage-db');
    return deactivateUserDb(userId, reason);
  }
  
  const users = await getUsers();
  const index = users.findIndex(u => u.id === userId);
  if (index === -1) return null;
  
  users[index] = {
    ...users[index],
    deactivatedAt: new Date().toISOString(),
    deactivationReason: reason,
    isActive: false,
  };
  
  await saveUsers(users);
  return users[index];
}

// アカウント復旧処理
export async function reactivateUser(userId: string): Promise<User | null> {
  const { shouldUseDatabase } = await import('./db');
  if (shouldUseDatabase()) {
    const { reactivateUser: reactivateUserDb } = await import('./storage-db');
    return reactivateUserDb(userId);
  }
  
  const users = await getUsers();
  const index = users.findIndex(u => u.id === userId);
  if (index === -1) return null;
  
  users[index] = {
    ...users[index],
    deactivatedAt: undefined,
    isActive: true,
  };
  
  await saveUsers(users);
  return users[index];
}

// 投稿管理
export async function getPosts(): Promise<Post[]> {
  // データベースが利用可能な場合はデータベースを使用
  if (await shouldUseDatabaseStorage()) {
    const { getPosts: getPostsDb } = await import('./storage-db');
    return getPostsDb();
  }
  
  // Vercelの本番環境ではファイルシステムを使用できない
  if (isVercelProduction()) {
    throwDatabaseRequiredError();
  }
  
  // ファイルシステムを使用する場合
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
  // データベースを使用する場合は、この関数を呼び出さない（storage-dbを使用）
  if (await shouldUseDatabaseStorage()) {
    throw new Error('savePosts should not be called when using database. Use storage-db functions instead.');
  }
  
  // Vercelの本番環境ではファイルシステムへの書き込みができない
  if (isVercelProduction()) {
    throw new Error('File system is read-only in Vercel production. Database storage is required.');
  }
  
  await ensureDataDir();
  await fs.writeFile(POSTS_FILE, JSON.stringify(posts, null, 2), 'utf-8');
}

export async function getPostById(id: string): Promise<Post | null> {
  // データベースが利用可能な場合はデータベースを使用
  if (await shouldUseDatabaseStorage()) {
    const { getPostById: getPostByIdDb } = await import('./storage-db');
    return getPostByIdDb(id);
  }
  
  // Vercelの本番環境ではファイルシステムを使用できない
  if (isVercelProduction()) {
    throwDatabaseRequiredError();
  }
  
  // ファイルシステムを使用する場合
  const posts = await getPosts();
  return posts.find(p => p.id === id) || null;
}

export async function createPost(post: Omit<Post, 'id' | 'createdAt' | 'updatedAt' | 'likes'>): Promise<Post> {
  // データベースが利用可能な場合はデータベースを使用
  if (await shouldUseDatabaseStorage()) {
    const { createPost: createPostDb } = await import('./storage-db');
    return createPostDb(post);
  }
  
  // Vercelの本番環境ではファイルシステムを使用できない
  if (isVercelProduction()) {
    throwDatabaseRequiredError();
  }
  
  // ファイルシステムを使用する場合
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
  // データベースが利用可能な場合はデータベースを使用
  if (await shouldUseDatabaseStorage()) {
    const { updatePost: updatePostDb } = await import('./storage-db');
    return updatePostDb(id, updates);
  }
  
  // Vercelの本番環境ではファイルシステムを使用できない
  if (isVercelProduction()) {
    throwDatabaseRequiredError();
  }
  
  // ファイルシステムを使用する場合
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
  // データベースが利用可能な場合はデータベースを使用
  if (await shouldUseDatabaseStorage()) {
    const { togglePostLike: togglePostLikeDb } = await import('./storage-db');
    return togglePostLikeDb(postId, userIdOrSessionId);
  }
  
  // Vercelの本番環境ではファイルシステムを使用できない
  if (isVercelProduction()) {
    throwDatabaseRequiredError();
  }
  
  // ファイルシステムを使用する場合
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
  // データベースが利用可能な場合はデータベースを使用
  if (await shouldUseDatabaseStorage()) {
    const { deletePost: deletePostDb } = await import('./storage-db');
    return deletePostDb(id);
  }
  
  // Vercelの本番環境ではファイルシステムを使用できない
  if (isVercelProduction()) {
    throwDatabaseRequiredError();
  }
  
  // ファイルシステムを使用する場合
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
  // データベースが利用可能な場合はデータベースを使用
  if (await shouldUseDatabaseStorage()) {
    const { adminDeletePost: adminDeletePostDb } = await import('./storage-db');
    return adminDeletePostDb(id);
  }
  
  // Vercelの本番環境ではファイルシステムを使用できない
  if (isVercelProduction()) {
    throwDatabaseRequiredError();
  }
  
  // ファイルシステムを使用する場合
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
  // データベースが利用可能な場合はデータベースを使用
  if (await shouldUseDatabaseStorage()) {
    const { updatePostsByUserId: updatePostsByUserIdDb } = await import('./storage-db');
    return updatePostsByUserIdDb(userId, updates);
  }
  
  // Vercelの本番環境ではファイルシステムを使用できない
  if (isVercelProduction()) {
    throwDatabaseRequiredError();
  }
  
  // ファイルシステムを使用する場合
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
  if (await shouldUseDatabaseStorage()) {
    const { getFeedbacks: getFeedbacksDb } = await import('./storage-db');
    return getFeedbacksDb();
  }
  
  await ensureDataDir();
  try {
    const data = await fs.readFile(FEEDBACK_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export async function saveFeedbacks(feedbacks: Feedback[]): Promise<void> {
  if (await shouldUseDatabaseStorage()) {
    throw new Error('saveFeedbacks should not be called when using database. Use storage-db functions instead.');
  }
  
  await ensureDataDir();
  await fs.writeFile(FEEDBACK_FILE, JSON.stringify(feedbacks, null, 2), 'utf-8');
}

export async function createFeedback(feedback: Omit<Feedback, 'id' | 'createdAt'>): Promise<Feedback> {
  if (await shouldUseDatabaseStorage()) {
    const { createFeedback: createFeedbackDb } = await import('./storage-db');
    return createFeedbackDb(feedback);
  }
  
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
  // データベースが利用可能な場合はデータベースを使用
  if (await shouldUseDatabaseStorage()) {
    const { getMessages: getMessagesDb } = await import('./storage-db');
    return getMessagesDb();
  }
  
  // Vercelの本番環境ではファイルシステムを使用できない
  if (isVercelProduction()) {
    throwDatabaseRequiredError();
  }
  
  // ファイルシステムを使用する場合
  await ensureDataDir();
  try {
    const data = await fs.readFile(MESSAGES_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export async function saveMessages(messages: Message[]): Promise<void> {
  // データベースを使用する場合は、この関数を呼び出さない（storage-dbを使用）
  if (await shouldUseDatabaseStorage()) {
    throw new Error('saveMessages should not be called when using database. Use storage-db functions instead.');
  }
  
  // Vercelの本番環境ではファイルシステムへの書き込みができない
  if (isVercelProduction()) {
    throw new Error('File system is read-only in Vercel production. Database storage is required.');
  }
  
  await ensureDataDir();
  await fs.writeFile(MESSAGES_FILE, JSON.stringify(messages, null, 2), 'utf-8');
}

export async function getMessagesByConversationId(conversationId: string): Promise<Message[]> {
  // データベースが利用可能な場合はデータベースを使用
  if (await shouldUseDatabaseStorage()) {
    const { getMessagesByConversationId: getMessagesByConversationIdDb } = await import('./storage-db');
    return getMessagesByConversationIdDb(conversationId);
  }
  
  // Vercelの本番環境ではファイルシステムを使用できない
  if (isVercelProduction()) {
    throwDatabaseRequiredError();
  }
  
  // ファイルシステムを使用する場合
  const messages = await getMessages();
  return messages.filter(m => m.conversationId === conversationId).sort((a, b) => 
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
}

export async function createMessage(message: Omit<Message, 'id' | 'createdAt' | 'read'>): Promise<Message> {
  // データベースが利用可能な場合はデータベースを使用
  if (await shouldUseDatabaseStorage()) {
    const { createMessage: createMessageDb } = await import('./storage-db');
    return createMessageDb(message);
  }
  
  // Vercelの本番環境ではファイルシステムを使用できない
  if (isVercelProduction()) {
    throwDatabaseRequiredError();
  }
  
  // ファイルシステムを使用する場合
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
  // データベースが利用可能な場合はデータベースを使用
  if (await shouldUseDatabaseStorage()) {
    const { markMessagesAsRead: markMessagesAsReadDb } = await import('./storage-db');
    return markMessagesAsReadDb(conversationId, userId);
  }
  
  // Vercelの本番環境ではファイルシステムを使用できない
  if (isVercelProduction()) {
    throwDatabaseRequiredError();
  }
  
  // ファイルシステムを使用する場合
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
  // データベースが利用可能な場合はデータベースを使用
  if (await shouldUseDatabaseStorage()) {
    const { getUnreadMessageCount: getUnreadMessageCountDb } = await import('./storage-db');
    return getUnreadMessageCountDb(userId);
  }
  
  // Vercelの本番環境ではファイルシステムを使用できない
  if (isVercelProduction()) {
    throwDatabaseRequiredError();
  }
  
  // ファイルシステムを使用する場合
  const messages = await getMessages();
  return messages.filter(m => m.receiverId === userId && !m.read).length;
}

export async function getMessageById(id: string): Promise<Message | null> {
  // データベースが利用可能な場合はデータベースを使用
  if (await shouldUseDatabaseStorage()) {
    const { getMessageById: getMessageByIdDb } = await import('./storage-db');
    return getMessageByIdDb(id);
  }
  
  // Vercelの本番環境ではファイルシステムを使用できない
  if (isVercelProduction()) {
    throwDatabaseRequiredError();
  }
  
  // ファイルシステムを使用する場合
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
  // データベースが利用可能な場合はデータベースを使用
  if (await shouldUseDatabaseStorage()) {
    const { deleteMessage: deleteMessageDb } = await import('./storage-db');
    return deleteMessageDb(id);
  }
  
  // Vercelの本番環境ではファイルシステムを使用できない
  if (isVercelProduction()) {
    throwDatabaseRequiredError();
  }
  
  // ファイルシステムを使用する場合
  const messages = await getMessages();
  const filtered = messages.filter(m => m.id !== id);
  if (filtered.length === messages.length) return false;
  await saveMessages(filtered);
  return true;
}

// 会話管理
export async function getConversations(): Promise<Conversation[]> {
  // データベースが利用可能な場合はデータベースを使用
  if (await shouldUseDatabaseStorage()) {
    const { getConversations: getConversationsDb } = await import('./storage-db');
    return getConversationsDb();
  }
  
  // Vercelの本番環境ではファイルシステムを使用できない
  if (isVercelProduction()) {
    throwDatabaseRequiredError();
  }
  
  // ファイルシステムを使用する場合
  await ensureDataDir();
  try {
    const data = await fs.readFile(CONVERSATIONS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export async function saveConversations(conversations: Conversation[]): Promise<void> {
  // データベースを使用する場合は、この関数を呼び出さない（storage-dbを使用）
  if (await shouldUseDatabaseStorage()) {
    throw new Error('saveConversations should not be called when using database. Use storage-db functions instead.');
  }
  
  // Vercelの本番環境ではファイルシステムへの書き込みができない
  if (isVercelProduction()) {
    throw new Error('File system is read-only in Vercel production. Database storage is required.');
  }
  
  await ensureDataDir();
  await fs.writeFile(CONVERSATIONS_FILE, JSON.stringify(conversations, null, 2), 'utf-8');
}

export async function getConversationByParticipants(userId1: string, userId2: string): Promise<Conversation | null> {
  // データベースが利用可能な場合はデータベースを使用
  if (await shouldUseDatabaseStorage()) {
    const { getConversationByParticipants: getConversationByParticipantsDb } = await import('./storage-db');
    return getConversationByParticipantsDb(userId1, userId2);
  }
  
  // Vercelの本番環境ではファイルシステムを使用できない
  if (isVercelProduction()) {
    throwDatabaseRequiredError();
  }
  
  // ファイルシステムを使用する場合
  const conversations = await getConversations();
  return conversations.find(c => {
    const ids = c.participantIds.sort();
    const searchIds = [userId1, userId2].sort();
    return ids[0] === searchIds[0] && ids[1] === searchIds[1];
  }) || null;
}

export async function getConversationsByUserId(userId: string): Promise<Conversation[]> {
  // データベースが利用可能な場合はデータベースを使用
  if (await shouldUseDatabaseStorage()) {
    const { getConversationsByUserId: getConversationsByUserIdDb } = await import('./storage-db');
    return getConversationsByUserIdDb(userId);
  }
  
  // Vercelの本番環境ではファイルシステムを使用できない
  if (isVercelProduction()) {
    throwDatabaseRequiredError();
  }
  
  // ファイルシステムを使用する場合
  const conversations = await getConversations();
  return conversations.filter(c => c.participantIds.includes(userId)).sort((a, b) => {
    const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : new Date(a.createdAt).getTime();
    const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : new Date(b.createdAt).getTime();
    return bTime - aTime; // 新しい順
  });
}

export async function createConversation(participantIds: [string, string]): Promise<Conversation> {
  // データベースが利用可能な場合はデータベースを使用
  if (await shouldUseDatabaseStorage()) {
    const { createConversation: createConversationDb } = await import('./storage-db');
    return createConversationDb(participantIds);
  }
  
  // Vercelの本番環境ではファイルシステムを使用できない
  if (isVercelProduction()) {
    throwDatabaseRequiredError();
  }
  
  // ファイルシステムを使用する場合
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
  // データベースが利用可能な場合はデータベースを使用
  if (await shouldUseDatabaseStorage()) {
    const { updateConversation: updateConversationDb } = await import('./storage-db');
    return updateConversationDb(conversationId, updates);
  }
  
  // Vercelの本番環境ではファイルシステムを使用できない
  if (isVercelProduction()) {
    throwDatabaseRequiredError();
  }
  
  // ファイルシステムを使用する場合
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
  // Vercelの本番環境ではファイルシステムを使用できない（先にチェック）
  if (isVercelProduction()) {
    // 本番環境では必ずデータベースを使用
    const { getGroupMessages: getGroupMessagesDb } = await import('./storage-db');
    return getGroupMessagesDb();
  }

  // データベースが利用可能な場合はデータベースを使用
  if (await shouldUseDatabaseStorage()) {
    const { getGroupMessages: getGroupMessagesDb } = await import('./storage-db');
    return getGroupMessagesDb();
  }

  // ファイルシステムを使用する場合
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
  // Vercelの本番環境ではファイルシステムを使用できない（先にチェック）
  if (isVercelProduction()) {
    // 本番環境では必ずデータベースを使用
    const { getGroupMessagesByGroupChatId: getGroupMessagesByGroupChatIdDb } = await import('./storage-db');
    return getGroupMessagesByGroupChatIdDb(groupChatId);
  }

  // データベースが利用可能な場合はデータベースを使用
  if (await shouldUseDatabaseStorage()) {
    const { getGroupMessagesByGroupChatId: getGroupMessagesByGroupChatIdDb } = await import('./storage-db');
    return getGroupMessagesByGroupChatIdDb(groupChatId);
  }

  // ファイルシステムを使用する場合
  const messages = await getGroupMessages();
  return messages
    .filter(m => m.groupChatId === groupChatId)
    .map(m => ({
      ...m,
      // readByがundefined/nullの場合は空配列として扱う（DB版と統一）
      readBy: Array.isArray(m.readBy) ? m.readBy : [],
    }))
    .sort((a, b) => 
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
}

export async function createGroupMessage(message: Omit<GroupMessage, 'id' | 'createdAt' | 'readBy'>): Promise<GroupMessage> {
  // Vercelの本番環境ではファイルシステムを使用できない（先にチェック）
  if (isVercelProduction()) {
    // 本番環境では必ずデータベースを使用
    const { createGroupMessage: createGroupMessageDb } = await import('./storage-db');
    return createGroupMessageDb(message);
  }

  // データベースが利用可能な場合はデータベースを使用
  if (await shouldUseDatabaseStorage()) {
    const { createGroupMessage: createGroupMessageDb } = await import('./storage-db');
    return createGroupMessageDb(message);
  }

  // ファイルシステムを使用する場合
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
  // Vercelの本番環境ではファイルシステムを使用できない（先にチェック）
  if (isVercelProduction()) {
    // 本番環境では必ずデータベースを使用
    const { markGroupMessageAsRead: markGroupMessageAsReadDb } = await import('./storage-db');
    return markGroupMessageAsReadDb(messageId, userId);
  }

  // データベースが利用可能な場合はデータベースを使用
  if (await shouldUseDatabaseStorage()) {
    const { markGroupMessageAsRead: markGroupMessageAsReadDb } = await import('./storage-db');
    return markGroupMessageAsReadDb(messageId, userId);
  }

  // ファイルシステムを使用する場合
  const messages = await getGroupMessages();
  const updated = messages.map(m => {
    // readByがundefined/nullの場合は空配列として扱う（DB版と統一）
    const currentReadBy = Array.isArray(m.readBy) ? m.readBy : [];
    if (m.id === messageId && !currentReadBy.includes(userId)) {
      return { ...m, readBy: [...currentReadBy, userId] };
    }
    return m;
  });
  await saveGroupMessages(updated);
}

export async function getGroupMessageById(id: string): Promise<GroupMessage | null> {
  // Vercelの本番環境ではファイルシステムを使用できない（先にチェック）
  if (isVercelProduction()) {
    // 本番環境では必ずデータベースを使用
    const { getGroupMessageById: getGroupMessageByIdDb } = await import('./storage-db');
    return getGroupMessageByIdDb(id);
  }

  // データベースが利用可能な場合はデータベースを使用
  if (await shouldUseDatabaseStorage()) {
    const { getGroupMessageById: getGroupMessageByIdDb } = await import('./storage-db');
    return getGroupMessageByIdDb(id);
  }

  // ファイルシステムを使用する場合
  const messages = await getGroupMessages();
  return messages.find(m => m.id === id) || null;
}

export async function updateGroupMessage(id: string, updates: Partial<GroupMessage>): Promise<GroupMessage | null> {
  // Vercelの本番環境ではファイルシステムを使用できない（先にチェック）
  if (isVercelProduction()) {
    // 本番環境では必ずデータベースを使用
    const { updateGroupMessage: updateGroupMessageDb } = await import('./storage-db');
    return updateGroupMessageDb(id, updates);
  }

  // データベースが利用可能な場合はデータベースを使用
  if (await shouldUseDatabaseStorage()) {
    const { updateGroupMessage: updateGroupMessageDb } = await import('./storage-db');
    return updateGroupMessageDb(id, updates);
  }

  // ファイルシステムを使用する場合
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
  // Vercelの本番環境ではファイルシステムを使用できない（先にチェック）
  if (isVercelProduction()) {
    // 本番環境では必ずデータベースを使用
    const { deleteGroupMessage: deleteGroupMessageDb } = await import('./storage-db');
    return deleteGroupMessageDb(id);
  }

  // データベースが利用可能な場合はデータベースを使用
  if (await shouldUseDatabaseStorage()) {
    const { deleteGroupMessage: deleteGroupMessageDb } = await import('./storage-db');
    return deleteGroupMessageDb(id);
  }

  // ファイルシステムを使用する場合
  const messages = await getGroupMessages();
  const filtered = messages.filter(m => m.id !== id);
  if (filtered.length === messages.length) return false;
  await saveGroupMessages(filtered);
  return true;
}

// グループチャット管理
export async function getGroupChats(): Promise<GroupChat[]> {
  // Vercelの本番環境ではファイルシステムを使用できない（先にチェック）
  if (isVercelProduction()) {
    // 本番環境では必ずデータベースを使用
    const { getGroupChats: getGroupChatsDb } = await import('./storage-db');
    return getGroupChatsDb();
  }

  // データベースが利用可能な場合はデータベースを使用
  if (await shouldUseDatabaseStorage()) {
    const { getGroupChats: getGroupChatsDb } = await import('./storage-db');
    return getGroupChatsDb();
  }

  // ファイルシステムを使用する場合
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
  // Vercelの本番環境ではファイルシステムを使用できない（先にチェック）
  if (isVercelProduction()) {
    // 本番環境では必ずデータベースを使用
    const { getGroupChatById: getGroupChatByIdDb } = await import('./storage-db');
    return getGroupChatByIdDb(id);
  }

  // データベースが利用可能な場合はデータベースを使用
  if (await shouldUseDatabaseStorage()) {
    const { getGroupChatById: getGroupChatByIdDb } = await import('./storage-db');
    return getGroupChatByIdDb(id);
  }

  // ファイルシステムを使用する場合
  const groupChats = await getGroupChats();
  return groupChats.find(gc => gc.id === id) || null;
}

export async function getGroupChatsByUserId(userId: string): Promise<GroupChat[]> {
  // Vercelの本番環境ではファイルシステムを使用できない（先にチェック）
  if (isVercelProduction()) {
    // 本番環境では必ずデータベースを使用
    const { getGroupChatsByUserId: getGroupChatsByUserIdDb } = await import('./storage-db');
    return getGroupChatsByUserIdDb(userId);
  }

  // データベースが利用可能な場合はデータベースを使用
  if (await shouldUseDatabaseStorage()) {
    const { getGroupChatsByUserId: getGroupChatsByUserIdDb } = await import('./storage-db');
    return getGroupChatsByUserIdDb(userId);
  }

  // ファイルシステムを使用する場合
  const groupChats = await getGroupChats();
  return groupChats.filter(gc => gc.participantIds.includes(userId)).sort((a, b) => {
    const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : new Date(a.createdAt).getTime();
    const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : new Date(b.createdAt).getTime();
    return bTime - aTime; // 新しい順
  });
}

export async function createGroupChat(groupChat: Omit<GroupChat, 'id' | 'createdAt' | 'updatedAt'>): Promise<GroupChat> {
  // Vercelの本番環境ではファイルシステムを使用できない（先にチェック）
  if (isVercelProduction()) {
    // 本番環境では必ずデータベースを使用
    const { createGroupChat: createGroupChatDb } = await import('./storage-db');
    return createGroupChatDb(groupChat);
  }

  // データベースが利用可能な場合はデータベースを使用
  if (await shouldUseDatabaseStorage()) {
    const { createGroupChat: createGroupChatDb } = await import('./storage-db');
    return createGroupChatDb(groupChat);
  }

  // ファイルシステムを使用する場合
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
  // Vercelの本番環境ではファイルシステムを使用できない（先にチェック）
  if (isVercelProduction()) {
    // 本番環境では必ずデータベースを使用
    const { updateGroupChat: updateGroupChatDb } = await import('./storage-db');
    return updateGroupChatDb(id, updates);
  }

  // データベースが利用可能な場合はデータベースを使用
  if (await shouldUseDatabaseStorage()) {
    const { updateGroupChat: updateGroupChatDb } = await import('./storage-db');
    return updateGroupChatDb(id, updates);
  }

  // ファイルシステムを使用する場合
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
  // Vercelの本番環境ではファイルシステムを使用できない（先にチェック）
  if (isVercelProduction()) {
    // 本番環境では必ずデータベースを使用
    const { addParticipantToGroupChat: addParticipantToGroupChatDb } = await import('./storage-db');
    return addParticipantToGroupChatDb(groupChatId, userId);
  }

  // データベースが利用可能な場合はデータベースを使用
  if (await shouldUseDatabaseStorage()) {
    const { addParticipantToGroupChat: addParticipantToGroupChatDb } = await import('./storage-db');
    return addParticipantToGroupChatDb(groupChatId, userId);
  }

  // ファイルシステムを使用する場合
  const groupChat = await getGroupChatById(groupChatId);
  if (!groupChat) return null;
  if (groupChat.participantIds.includes(userId)) return groupChat; // 既に参加している
  return updateGroupChat(groupChatId, {
    participantIds: [...groupChat.participantIds, userId],
  });
}

export async function removeParticipantFromGroupChat(groupChatId: string, userId: string): Promise<GroupChat | null> {
  // Vercelの本番環境ではファイルシステムを使用できない（先にチェック）
  if (isVercelProduction()) {
    // 本番環境では必ずデータベースを使用
    const { removeParticipantFromGroupChat: removeParticipantFromGroupChatDb } = await import('./storage-db');
    return removeParticipantFromGroupChatDb(groupChatId, userId);
  }

  // データベースが利用可能な場合はデータベースを使用
  if (await shouldUseDatabaseStorage()) {
    const { removeParticipantFromGroupChat: removeParticipantFromGroupChatDb } = await import('./storage-db');
    return removeParticipantFromGroupChatDb(groupChatId, userId);
  }

  // ファイルシステムを使用する場合
  const groupChat = await getGroupChatById(groupChatId);
  if (!groupChat) return null;
  return updateGroupChat(groupChatId, {
    participantIds: groupChat.participantIds.filter(id => id !== userId),
  });
}

// パスワードリセットトークン管理
export async function createPasswordResetToken(userId: string, email: string, token: string, expiresInHours: number = 24): Promise<PasswordResetToken> {
  // Vercelの本番環境ではファイルシステムを使用できない（先にチェック）
  if (isVercelProduction()) {
    // 本番環境では必ずデータベースを使用
    const { createPasswordResetToken: createPasswordResetTokenDb } = await import('./storage-db');
    return createPasswordResetTokenDb(userId, email, token, expiresInHours);
  }
  
  // データベースが利用可能な場合はデータベースを使用
  if (await shouldUseDatabaseStorage()) {
    const { createPasswordResetToken: createPasswordResetTokenDb } = await import('./storage-db');
    return createPasswordResetTokenDb(userId, email, token, expiresInHours);
  }
  
  // ファイルシステムを使用する場合
  await ensureDataDir();
  try {
    const data = await fs.readFile(PASSWORD_RESET_TOKENS_FILE, 'utf-8');
    const tokens: PasswordResetToken[] = JSON.parse(data);
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
    await fs.writeFile(PASSWORD_RESET_TOKENS_FILE, JSON.stringify(tokens, null, 2), 'utf-8');
    return resetToken;
  } catch {
    // ファイルが存在しない場合は新規作成
    const tokens: PasswordResetToken[] = [];
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
    await fs.writeFile(PASSWORD_RESET_TOKENS_FILE, JSON.stringify(tokens, null, 2), 'utf-8');
    return resetToken;
  }
}

export async function getPasswordResetTokenByToken(token: string): Promise<PasswordResetToken | null> {
  // Vercelの本番環境ではファイルシステムを使用できない（先にチェック）
  if (isVercelProduction()) {
    // 本番環境では必ずデータベースを使用
    const { getPasswordResetTokenByToken: getPasswordResetTokenByTokenDb } = await import('./storage-db');
    return getPasswordResetTokenByTokenDb(token);
  }
  
  // データベースが利用可能な場合はデータベースを使用
  if (await shouldUseDatabaseStorage()) {
    const { getPasswordResetTokenByToken: getPasswordResetTokenByTokenDb } = await import('./storage-db');
    return getPasswordResetTokenByTokenDb(token);
  }
  
  // ファイルシステムを使用する場合
  await ensureDataDir();
  try {
    const data = await fs.readFile(PASSWORD_RESET_TOKENS_FILE, 'utf-8');
    const tokens: PasswordResetToken[] = JSON.parse(data);
    const resetToken = tokens.find(t => t.token === token && !t.used);
    
    if (!resetToken) return null;
    
    // 有効期限チェック
    const expiresAt = new Date(resetToken.expiresAt);
    if (expiresAt < new Date()) {
      return null; // 期限切れ
    }
    
    return resetToken;
  } catch {
    return null;
  }
}

export async function markPasswordResetTokenAsUsed(token: string): Promise<void> {
  // Vercelの本番環境ではファイルシステムを使用できない（先にチェック）
  if (isVercelProduction()) {
    // 本番環境では必ずデータベースを使用
    const { markPasswordResetTokenAsUsed: markPasswordResetTokenAsUsedDb } = await import('./storage-db');
    return markPasswordResetTokenAsUsedDb(token);
  }
  
  // データベースが利用可能な場合はデータベースを使用
  if (await shouldUseDatabaseStorage()) {
    const { markPasswordResetTokenAsUsed: markPasswordResetTokenAsUsedDb } = await import('./storage-db');
    return markPasswordResetTokenAsUsedDb(token);
  }
  
  // ファイルシステムを使用する場合
  await ensureDataDir();
  try {
    const data = await fs.readFile(PASSWORD_RESET_TOKENS_FILE, 'utf-8');
    const tokens: PasswordResetToken[] = JSON.parse(data);
    const index = tokens.findIndex(t => t.token === token);
    
    if (index !== -1) {
      tokens[index].used = true;
      await fs.writeFile(PASSWORD_RESET_TOKENS_FILE, JSON.stringify(tokens, null, 2), 'utf-8');
    }
  } catch (error) {
    console.error('Failed to mark password reset token as used:', error);
  }
}

export async function deleteExpiredPasswordResetTokens(): Promise<void> {
  // データベースが利用可能な場合はデータベースを使用
  if (await shouldUseDatabaseStorage()) {
    const { deleteExpiredPasswordResetTokens: deleteExpiredPasswordResetTokensDb } = await import('./storage-db');
    return deleteExpiredPasswordResetTokensDb();
  }
  
  // Vercelの本番環境ではファイルシステムを使用できない
  const isVercelProduction = process.env.VERCEL === '1' || process.env.VERCEL_ENV === 'production';
  if (isVercelProduction) {
    return; // 本番環境ではスキップ（データベースを使用する必要がある）
  }
  
  // ファイルシステムを使用する場合
  await ensureDataDir();
  try {
    const data = await fs.readFile(PASSWORD_RESET_TOKENS_FILE, 'utf-8');
    const tokens: PasswordResetToken[] = JSON.parse(data);
    const now = new Date();
    const validTokens = tokens.filter(t => {
      const expiresAt = new Date(t.expiresAt);
      return expiresAt >= now && !t.used;
    });
    
    if (validTokens.length !== tokens.length) {
      await fs.writeFile(PASSWORD_RESET_TOKENS_FILE, JSON.stringify(validTokens, null, 2), 'utf-8');
    }
  } catch (error) {
    console.error('Failed to delete expired password reset tokens:', error);
  }
}

// ブロックリスト管理
interface BlockedUser {
  userId: string; // ブロックしたユーザーID
  blockedUserId: string; // ブロックされたユーザーID
  createdAt: string;
}

export async function getBlockedUsers(): Promise<BlockedUser[]> {
  // データベースが利用可能な場合はデータベースを使用
  if (await shouldUseDatabaseStorage()) {
    // データベースから取得する場合は、getBlockedUserIdsを使用
    // この関数は後方互換性のため残すが、通常はgetBlockedUserIdsを使用
    throw new Error('getBlockedUsers should not be called when using database. Use getBlockedUserIds instead.');
  }
  
  // Vercelの本番環境ではファイルシステムを使用できない
  if (isVercelProduction()) {
    throwDatabaseRequiredError();
  }
  
  // ファイルシステムを使用する場合
  await ensureDataDir();
  try {
    const data = await fs.readFile(BLOCKED_USERS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export async function saveBlockedUsers(blockedUsers: BlockedUser[]): Promise<void> {
  // データベースを使用する場合は、この関数を呼び出さない（storage-dbを使用）
  if (await shouldUseDatabaseStorage()) {
    throw new Error('saveBlockedUsers should not be called when using database. Use storage-db functions instead.');
  }
  
  // Vercelの本番環境ではファイルシステムへの書き込みができない
  if (isVercelProduction()) {
    throw new Error('File system is read-only in Vercel production. Database storage is required.');
  }
  
  await ensureDataDir();
  await fs.writeFile(BLOCKED_USERS_FILE, JSON.stringify(blockedUsers, null, 2), 'utf-8');
}

export async function getBlockedUserIds(userId: string): Promise<string[]> {
  // Vercelの本番環境ではファイルシステムを使用できない（先にチェック）
  if (isVercelProduction()) {
    // 本番環境では必ずデータベースを使用
    const { getBlockedUserIds: getBlockedUserIdsDb } = await import('./storage-db');
    return getBlockedUserIdsDb(userId);
  }
  
  // データベースが利用可能な場合はデータベースを使用
  if (await shouldUseDatabaseStorage()) {
    const { getBlockedUserIds: getBlockedUserIdsDb } = await import('./storage-db');
    return getBlockedUserIdsDb(userId);
  }
  
  // ファイルシステムを使用する場合
  const blockedUsers = await getBlockedUsers();
  return blockedUsers
    .filter(bu => bu.userId === userId)
    .map(bu => bu.blockedUserId);
}

export async function isUserBlocked(userId: string, blockedUserId: string): Promise<boolean> {
  // Vercelの本番環境ではファイルシステムを使用できない（先にチェック）
  if (isVercelProduction()) {
    // 本番環境では必ずデータベースを使用
    const { isUserBlocked: isUserBlockedDb } = await import('./storage-db');
    return isUserBlockedDb(userId, blockedUserId);
  }
  
  // データベースが利用可能な場合はデータベースを使用
  if (await shouldUseDatabaseStorage()) {
    const { isUserBlocked: isUserBlockedDb } = await import('./storage-db');
    return isUserBlockedDb(userId, blockedUserId);
  }
  
  // ファイルシステムを使用する場合
  const blockedUsers = await getBlockedUsers();
  return blockedUsers.some(bu => bu.userId === userId && bu.blockedUserId === blockedUserId);
}

export async function blockUser(userId: string, blockedUserId: string): Promise<void> {
  // Vercelの本番環境ではファイルシステムを使用できない（先にチェック）
  if (isVercelProduction()) {
    // 本番環境では必ずデータベースを使用
    const { blockUser: blockUserDb } = await import('./storage-db');
    return blockUserDb(userId, blockedUserId);
  }
  
  // データベースが利用可能な場合はデータベースを使用
  if (await shouldUseDatabaseStorage()) {
    const { blockUser: blockUserDb } = await import('./storage-db');
    return blockUserDb(userId, blockedUserId);
  }
  
  // ファイルシステムを使用する場合
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
  // Vercelの本番環境ではファイルシステムを使用できない（先にチェック）
  if (isVercelProduction()) {
    // 本番環境では必ずデータベースを使用
    const { unblockUser: unblockUserDb } = await import('./storage-db');
    return unblockUserDb(userId, blockedUserId);
  }
  
  // データベースが利用可能な場合はデータベースを使用
  if (await shouldUseDatabaseStorage()) {
    const { unblockUser: unblockUserDb } = await import('./storage-db');
    return unblockUserDb(userId, blockedUserId);
  }
  
  // ファイルシステムを使用する場合
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
  // データベースが利用可能な場合はデータベースを使用
  if (await shouldUseDatabaseStorage()) {
    const { getAnnouncements: getAnnouncementsDb } = await import('./storage-db');
    return getAnnouncementsDb();
  }
  
  // Vercelの本番環境ではファイルシステムを使用できない
  if (isVercelProduction()) {
    throwDatabaseRequiredError();
  }
  
  // ファイルシステムを使用する場合
  await ensureDataDir();
  try {
    const data = await fs.readFile(ANNOUNCEMENTS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export async function saveAnnouncements(announcements: Announcement[]): Promise<void> {
  // データベースを使用する場合は、この関数を呼び出さない（storage-dbを使用）
  if (await shouldUseDatabaseStorage()) {
    throw new Error('saveAnnouncements should not be called when using database. Use storage-db functions instead.');
  }
  
  // Vercelの本番環境ではファイルシステムへの書き込みができない
  if (isVercelProduction()) {
    throw new Error('File system is read-only in Vercel production. Database storage is required.');
  }
  
  await ensureDataDir();
  await fs.writeFile(ANNOUNCEMENTS_FILE, JSON.stringify(announcements, null, 2), 'utf-8');
}

export async function getVisibleAnnouncements(): Promise<Announcement[]> {
  // データベースが利用可能な場合はデータベースを使用
  if (await shouldUseDatabaseStorage()) {
    const { getVisibleAnnouncements: getVisibleAnnouncementsDb } = await import('./storage-db');
    return getVisibleAnnouncementsDb();
  }
  
  // Vercelの本番環境ではファイルシステムを使用できない
  if (isVercelProduction()) {
    throwDatabaseRequiredError();
  }
  
  // ファイルシステムを使用する場合
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
  // データベースが利用可能な場合はデータベースを使用
  if (await shouldUseDatabaseStorage()) {
    const { getAnnouncementById: getAnnouncementByIdDb } = await import('./storage-db');
    return getAnnouncementByIdDb(id);
  }
  
  // Vercelの本番環境ではファイルシステムを使用できない
  if (isVercelProduction()) {
    throwDatabaseRequiredError();
  }
  
  // ファイルシステムを使用する場合
  const announcements = await getAnnouncements();
  return announcements.find(a => a.id === id) || null;
}

export async function createAnnouncement(announcement: Omit<Announcement, 'id' | 'createdAt' | 'updatedAt'>): Promise<Announcement> {
  // データベースが利用可能な場合はデータベースを使用
  if (await shouldUseDatabaseStorage()) {
    const { createAnnouncement: createAnnouncementDb } = await import('./storage-db');
    return createAnnouncementDb(announcement);
  }
  
  // Vercelの本番環境ではファイルシステムを使用できない
  if (isVercelProduction()) {
    throwDatabaseRequiredError();
  }
  
  // ファイルシステムを使用する場合
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
  // データベースが利用可能な場合はデータベースを使用
  if (await shouldUseDatabaseStorage()) {
    const { updateAnnouncement: updateAnnouncementDb } = await import('./storage-db');
    return updateAnnouncementDb(id, updates);
  }
  
  // Vercelの本番環境ではファイルシステムを使用できない
  if (isVercelProduction()) {
    throwDatabaseRequiredError();
  }
  
  // ファイルシステムを使用する場合
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
  // データベースが利用可能な場合はデータベースを使用
  if (await shouldUseDatabaseStorage()) {
    const { deleteAnnouncement: deleteAnnouncementDb } = await import('./storage-db');
    return deleteAnnouncementDb(id);
  }
  
  // Vercelの本番環境ではファイルシステムを使用できない
  if (isVercelProduction()) {
    throwDatabaseRequiredError();
  }
  
  // ファイルシステムを使用する場合
  const announcements = await getAnnouncements();
  const filtered = announcements.filter(a => a.id !== id);
  
  if (filtered.length === announcements.length) {
    return false; // 削除対象が見つからなかった
  }
  
  await saveAnnouncements(filtered);
  return true;
}

// ==================== システム設定（メンテナンスモード） ====================

export interface SystemSettings {
  id: string;
  isMaintenance: boolean;
  maintenanceMessage: string | null;
  updatedAt: string;
}

export async function getSystemSettings(): Promise<SystemSettings> {
  const { shouldUseDatabase } = await import('./db');
  if (shouldUseDatabase()) {
    const { getSystemSettings: getSystemSettingsDb } = await import('./storage-db');
    const settings = await getSystemSettingsDb();
    return settings || {
      id: 'maintenance',
      isMaintenance: false,
      maintenanceMessage: '現在メンテナンス中です。ご迷惑をおかけいたします。',
      updatedAt: new Date().toISOString(),
    };
  }
  
  // ファイルシステムを使用する場合（開発環境のみ）
  try {
    const fs = await import('fs/promises');
    const path = await import('path');
    const filePath = path.join(process.cwd(), 'data', 'system-settings.json');
    
    try {
      const data = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(data);
    } catch {
      // ファイルが存在しない場合はデフォルト値を返す
      const defaultSettings: SystemSettings = {
        id: 'maintenance',
        isMaintenance: false,
        maintenanceMessage: '現在メンテナンス中です。ご迷惑をおかけいたします。',
        updatedAt: new Date().toISOString(),
      };
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, JSON.stringify(defaultSettings, null, 2));
      return defaultSettings;
    }
  } catch (error) {
    console.error('Failed to get system settings:', error);
    return {
      id: 'maintenance',
      isMaintenance: false,
      maintenanceMessage: '現在メンテナンス中です。ご迷惑をおかけいたします。',
      updatedAt: new Date().toISOString(),
    };
  }
}

export async function updateSystemSettings(settings: Partial<SystemSettings>): Promise<SystemSettings> {
  const { shouldUseDatabase } = await import('./db');
  if (shouldUseDatabase()) {
    const { updateSystemSettings: updateSystemSettingsDb } = await import('./storage-db');
    return updateSystemSettingsDb(settings);
  }
  
  // ファイルシステムを使用する場合（開発環境のみ）
  try {
    const fs = await import('fs/promises');
    const path = await import('path');
    const filePath = path.join(process.cwd(), 'data', 'system-settings.json');
    
    const currentSettings = await getSystemSettings();
    const updatedSettings: SystemSettings = {
      ...currentSettings,
      ...settings,
      updatedAt: new Date().toISOString(),
    };
    
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(updatedSettings, null, 2));
    return updatedSettings;
  } catch (error) {
    console.error('Failed to update system settings:', error);
    throw error;
  }
}

