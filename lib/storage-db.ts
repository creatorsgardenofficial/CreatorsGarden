import { pool } from './db';
import { User, Post, Comment, Feedback, Message, Conversation, GroupMessage, GroupChat, Bookmark, PasswordResetToken, Announcement } from '@/types';

/**
 * PostgreSQL対応のストレージ実装
 * データベースが利用可能な場合に使用
 */

// ==================== ユーザー管理 ====================

export async function getUsers(): Promise<User[]> {
  // この関数はデータベース専用。shouldUseDatabase()のチェックはstorage.tsで行う
  try {
    const result = await pool.query(
      `SELECT
        id,
        username,
        email,
        password,
        creator_type as "creatorType",
        bio,
        portfolio_urls as "portfolioUrls",
        is_active as "isActive",
        public_id as "publicId",
        created_at as "createdAt",
        failed_login_attempts as "failedLoginAttempts",
        account_locked_until as "accountLockedUntil",
        subscription
      FROM users
      ORDER BY created_at DESC`
    );
    
    return result.rows.map(row => ({
      ...row,
      subscription: row.subscription || { planType: 'free', status: 'active' },
      portfolioUrls: row.portfolioUrls || undefined,
    })) as User[];
  } catch (error) {
    console.error('Failed to get users from database:', error);
    throw error;
  }
}

export async function getUserById(id: string): Promise<User | null> {
  // この関数はデータベース専用。shouldUseDatabase()のチェックはstorage.tsで行う
  try {
    const result = await pool.query(
      `SELECT
        id,
        username,
        email,
        password,
        creator_type as "creatorType",
        bio,
        portfolio_urls as "portfolioUrls",
        is_active as "isActive",
        public_id as "publicId",
        created_at as "createdAt",
        failed_login_attempts as "failedLoginAttempts",
        account_locked_until as "accountLockedUntil",
        subscription
      FROM users
      WHERE id = $1
      LIMIT 1`,
      [id]
    );
    
    if (result.rows.length === 0) return null;
    
    const row = result.rows[0];
    return {
      ...row,
      subscription: row.subscription || { planType: 'free', status: 'active' },
      portfolioUrls: row.portfolioUrls || undefined,
    } as User;
  } catch (error) {
    console.error('Failed to get user by id from database:', error);
    throw error;
  }
}

export async function getUserByEmail(email: string): Promise<User | null> {
  // この関数はデータベース専用。shouldUseDatabase()のチェックはstorage.tsで行う
  try {
    const result = await pool.query(
      `SELECT
        id,
        username,
        email,
        password,
        creator_type as "creatorType",
        bio,
        portfolio_urls as "portfolioUrls",
        is_active as "isActive",
        public_id as "publicId",
        created_at as "createdAt",
        failed_login_attempts as "failedLoginAttempts",
        account_locked_until as "accountLockedUntil",
        subscription
      FROM users
      WHERE email = $1
      LIMIT 1`,
      [email]
    );
    
    if (result.rows.length === 0) return null;
    
    const row = result.rows[0];
    return {
      ...row,
      subscription: row.subscription || { planType: 'free', status: 'active' },
      portfolioUrls: row.portfolioUrls || undefined,
    } as User;
  } catch (error) {
    console.error('Failed to get user by email from database:', error);
    throw error;
  }
}

export async function getUserByPublicId(publicId: string): Promise<User | null> {
  // この関数はデータベース専用。shouldUseDatabase()のチェックはstorage.tsで行う
  try {
    const result = await pool.query(
      `SELECT
        id,
        username,
        email,
        password,
        creator_type as "creatorType",
        bio,
        portfolio_urls as "portfolioUrls",
        is_active as "isActive",
        public_id as "publicId",
        created_at as "createdAt",
        failed_login_attempts as "failedLoginAttempts",
        account_locked_until as "accountLockedUntil",
        subscription
      FROM users
      WHERE public_id = $1
        AND (is_active IS NULL OR is_active = true)
      LIMIT 1`,
      [publicId]
    );
    
    if (result.rows.length === 0) return null;
    
    const row = result.rows[0];
    return {
      ...row,
      subscription: row.subscription || { planType: 'free', status: 'active' },
      portfolioUrls: row.portfolioUrls || undefined,
    } as User;
  } catch (error) {
    console.error('Failed to get user by public id from database:', error);
    throw error;
  }
}

async function generateUniquePublicId(): Promise<string> {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let publicId: string;
  let attempts = 0;
  
  do {
    publicId = '';
    for (let i = 0; i < 8; i++) {
      publicId += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    attempts++;
    if (attempts > 100) {
      publicId = Date.now().toString(36).toUpperCase().slice(-8);
      break;
    }
    // データベース専用なので、直接SQLクエリを実行
    const result = await pool.query(
      'SELECT id FROM users WHERE public_id = $1 LIMIT 1',
      [publicId]
    );
    if (result.rows.length === 0) break;
  } while (true);
  
  return publicId;
}

export async function createUser(user: Omit<User, 'id' | 'createdAt' | 'publicId'>): Promise<User> {
  // この関数はデータベース専用。shouldUseDatabase()のチェックはstorage.tsで行う
  try {
    const publicId = await generateUniquePublicId();
    const id = Date.now().toString();
    const createdAt = new Date().toISOString();
    const subscription = user.subscription || { planType: 'free', status: 'active' };
    await pool.query(
      `INSERT INTO users (
        id, username, email, password, creator_type, bio, portfolio_urls,
        is_active, public_id, created_at, subscription
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11
      )`,
      [
        id,
        user.username,
        user.email,
        user.password,
        user.creatorType,
        user.bio || null,
        JSON.stringify(user.portfolioUrls || null),
        user.isActive !== undefined ? user.isActive : true,
        publicId,
        createdAt,
        JSON.stringify(subscription),
      ]
    );
    
    return {
      ...user,
      id,
      publicId,
      createdAt,
      subscription,
      isActive: user.isActive !== undefined ? user.isActive : true,
    } as User;
  } catch (error) {
    console.error('Failed to create user in database:', error);
    throw error;
  }
}

export async function updateUser(id: string, updates: Partial<User>): Promise<User | null> {
  // この関数はデータベース専用。shouldUseDatabase()のチェックはstorage.tsで行う
  try {
    // まず既存のユーザーを取得
    const existingUser = await getUserById(id);
    if (!existingUser) return null;
    
    // 更新するフィールドを構築
    const username = updates.username !== undefined ? updates.username : existingUser.username;
    const email = updates.email !== undefined ? updates.email : existingUser.email;
    const password = updates.password !== undefined ? updates.password : existingUser.password;
    const creatorType = updates.creatorType !== undefined ? updates.creatorType : existingUser.creatorType;
    const bio = updates.bio !== undefined ? updates.bio : existingUser.bio;
    const portfolioUrls = updates.portfolioUrls !== undefined ? updates.portfolioUrls : existingUser.portfolioUrls;
    const isActive = updates.isActive !== undefined ? updates.isActive : existingUser.isActive;
    const failedLoginAttempts = updates.failedLoginAttempts !== undefined ? updates.failedLoginAttempts : existingUser.failedLoginAttempts;
    const accountLockedUntil = updates.accountLockedUntil !== undefined ? updates.accountLockedUntil : existingUser.accountLockedUntil;
    // subscriptionをマージ
    const subscription = updates.subscription 
      ? { ...existingUser.subscription, ...updates.subscription }
      : existingUser.subscription || { planType: 'free', status: 'active' };
    await pool.query(
      `UPDATE users
       SET
         username = $1,
         email = $2,
         password = $3,
         creator_type = $4,
         bio = $5,
         portfolio_urls = $6,
         is_active = $7,
         failed_login_attempts = $8,
         account_locked_until = $9,
         subscription = $10
       WHERE id = $11`,
      [
        username,
        email,
        password,
        creatorType,
        bio || null,
        JSON.stringify(portfolioUrls || null),
        isActive !== undefined ? isActive : true,
        failedLoginAttempts || 0,
        accountLockedUntil || null,
        JSON.stringify(subscription),
        id,
      ]
    );
    
    return getUserById(id);
  } catch (error) {
    console.error('Failed to update user in database:', error);
    throw error;
  }
}

// ==================== パスワードリセットトークン管理 ====================

export async function createPasswordResetToken(userId: string, email: string, token: string, expiresInHours: number = 24): Promise<PasswordResetToken> {
  try {
    const id = Date.now().toString();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + expiresInHours * 60 * 60 * 1000);
    
    await pool.query(
      `INSERT INTO password_reset_tokens (id, user_id, token, expires_at, used, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [id, userId, token, expiresAt.toISOString(), false, now.toISOString()]
    );
    
    return {
      id,
      userId,
      token,
      email,
      expiresAt: expiresAt.toISOString(),
      used: false,
      createdAt: now.toISOString(),
    };
  } catch (error) {
    console.error('Failed to create password reset token in database:', error);
    throw error;
  }
}

export async function getPasswordResetTokenByToken(token: string): Promise<PasswordResetToken | null> {
  try {
    const result = await pool.query(
      `SELECT 
        prt.id,
        prt.user_id as "userId",
        prt.token,
        u.email,
        prt.expires_at as "expiresAt",
        prt.used,
        prt.created_at as "createdAt"
      FROM password_reset_tokens prt
      JOIN users u ON prt.user_id = u.id
      WHERE prt.token = $1 AND prt.used = false
      LIMIT 1`,
      [token]
    );
    
    if (result.rows.length === 0) return null;
    
    const row = result.rows[0];
    
    // 有効期限チェック
    const expiresAt = new Date(row.expiresAt);
    if (expiresAt < new Date()) {
      return null; // 期限切れ
    }
    
    return {
      id: row.id,
      userId: row.userId,
      token: row.token,
      email: row.email,
      expiresAt: row.expiresAt,
      used: row.used,
      createdAt: row.createdAt,
    };
  } catch (error) {
    console.error('Failed to get password reset token from database:', error);
    throw error;
  }
}

export async function markPasswordResetTokenAsUsed(token: string): Promise<void> {
  try {
    await pool.query(
      `UPDATE password_reset_tokens SET used = true WHERE token = $1`,
      [token]
    );
  } catch (error) {
    console.error('Failed to mark password reset token as used in database:', error);
    throw error;
  }
}

export async function deleteExpiredPasswordResetTokens(): Promise<void> {
  try {
    await pool.query(
      `DELETE FROM password_reset_tokens 
       WHERE expires_at < NOW() OR used = true`
    );
  } catch (error) {
    console.error('Failed to delete expired password reset tokens from database:', error);
    throw error;
  }
}

// ==================== 投稿管理 ====================

export async function getPosts(): Promise<Post[]> {
  try {
    const result = await pool.query(`
      SELECT
        p.id,
        p.user_id as "userId",
        u.username,
        u.creator_type as "creatorType",
        p.type,
        p.title,
        p.content,
        p.tags,
        p.status,
        p.priority_display as "priorityDisplay",
        p.featured_display as "featuredDisplay",
        p.likes,
        p.created_at as "createdAt",
        p.updated_at as "updatedAt",
        p.is_deleted as "isDeleted"
      FROM posts p
      JOIN users u ON p.user_id = u.id
      WHERE p.is_deleted = false
      ORDER BY p.created_at DESC
    `);
    
    return result.rows.map(row => ({
      id: row.id,
      userId: row.userId,
      username: row.username,
      creatorType: row.creatorType,
      type: row.type,
      title: row.title,
      content: row.content,
      tags: row.tags || [],
      status: row.status,
      priorityDisplay: row.priorityDisplay || false,
      featuredDisplay: row.featuredDisplay || false,
      likes: row.likes || [],
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      // url と urls はスキーマにないため、一旦 undefined
      // 必要に応じてスキーマを拡張する
    })) as Post[];
  } catch (error) {
    console.error('Failed to get posts from database:', error);
    throw error;
  }
}

export async function getPostById(id: string): Promise<Post | null> {
  try {
    const result = await pool.query(`
      SELECT
        p.id,
        p.user_id as "userId",
        u.username,
        u.creator_type as "creatorType",
        p.type,
        p.title,
        p.content,
        p.tags,
        p.status,
        p.priority_display as "priorityDisplay",
        p.featured_display as "featuredDisplay",
        p.likes,
        p.created_at as "createdAt",
        p.updated_at as "updatedAt",
        p.is_deleted as "isDeleted"
      FROM posts p
      JOIN users u ON p.user_id = u.id
      WHERE p.id = $1 AND p.is_deleted = false
      LIMIT 1
    `, [id]);
    
    if (result.rows.length === 0) return null;
    
    const row = result.rows[0];
    return {
      id: row.id,
      userId: row.userId,
      username: row.username,
      creatorType: row.creatorType,
      type: row.type,
      title: row.title,
      content: row.content,
      tags: row.tags || [],
      status: row.status,
      priorityDisplay: row.priorityDisplay || false,
      featuredDisplay: row.featuredDisplay || false,
      likes: row.likes || [],
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    } as Post;
  } catch (error) {
    console.error('Failed to get post by id from database:', error);
    throw error;
  }
}

export async function createPost(post: Omit<Post, 'id' | 'createdAt' | 'updatedAt' | 'likes'>): Promise<Post> {
  try {
    const id = Date.now().toString();
    const now = new Date().toISOString();
    
    // 投稿者のプラン情報を取得して優先表示フラグを設定
    const user = await getUserById(post.userId);
    const planType = user?.subscription?.planType || 'free';
    const isActive = user?.subscription?.status === 'active';
    const priorityDisplay = (planType === 'grow' || planType === 'bloom') && isActive;
    const featuredDisplay = (planType === 'grow' || planType === 'bloom') && isActive;
    
    await pool.query(`
      INSERT INTO posts (
        id, user_id, type, title, content, tags, status,
        priority_display, featured_display, likes, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
      )
    `, [
      id,
      post.userId,
      post.type,
      post.title,
      post.content,
      post.tags || [],
      post.status || 'open',
      priorityDisplay,
      featuredDisplay,
      [],
      now,
      now,
    ]);
    
    return {
      ...post,
      id,
      likes: [],
      priorityDisplay,
      featuredDisplay,
      createdAt: now,
      updatedAt: now,
    } as Post;
  } catch (error) {
    console.error('Failed to create post in database:', error);
    throw error;
  }
}

export async function updatePost(id: string, updates: Partial<Post>): Promise<Post | null> {
  try {
    // 既存の投稿を取得
    const existingPost = await getPostById(id);
    if (!existingPost) return null;
    
    // 投稿者のプラン情報を取得して優先表示フラグを更新
    const user = await getUserById(existingPost.userId);
    const planType = user?.subscription?.planType || 'free';
    const isActive = user?.subscription?.status === 'active';
    const priorityDisplay = (planType === 'grow' || planType === 'bloom') && isActive;
    const featuredDisplay = (planType === 'grow' || planType === 'bloom') && isActive;
    
    const title = updates.title !== undefined ? updates.title : existingPost.title;
    const content = updates.content !== undefined ? updates.content : existingPost.content;
    const tags = updates.tags !== undefined ? updates.tags : existingPost.tags;
    const status = updates.status !== undefined ? updates.status : existingPost.status;
    const updatedAt = new Date().toISOString();
    
    await pool.query(`
      UPDATE posts
      SET
        title = $1,
        content = $2,
        tags = $3,
        status = $4,
        priority_display = $5,
        featured_display = $6,
        updated_at = $7
      WHERE id = $8
    `, [
      title,
      content,
      tags || [],
      status,
      priorityDisplay,
      featuredDisplay,
      updatedAt,
      id,
    ]);
    
    return getPostById(id);
  } catch (error) {
    console.error('Failed to update post in database:', error);
    throw error;
  }
}

export async function togglePostLike(postId: string, userIdOrSessionId: string): Promise<Post | null> {
  try {
    const post = await getPostById(postId);
    if (!post) return null;
    
    const likes = post.likes || [];
    const likeIndex = likes.indexOf(userIdOrSessionId);
    
    let newLikes: string[];
    if (likeIndex === -1) {
      // いいねを追加
      newLikes = [...likes, userIdOrSessionId];
    } else {
      // いいねを削除
      newLikes = likes.filter((_, index) => index !== likeIndex);
    }
    
    await pool.query(`
      UPDATE posts
      SET likes = $1, updated_at = $2
      WHERE id = $3
    `, [newLikes, new Date().toISOString(), postId]);
    
    return getPostById(postId);
  } catch (error) {
    console.error('Failed to toggle post like in database:', error);
    throw error;
  }
}

export async function deletePost(id: string): Promise<boolean> {
  try {
    const result = await pool.query(`
      UPDATE posts
      SET is_deleted = true, deleted_at = $1
      WHERE id = $2
    `, [new Date().toISOString(), id]);
    
    return result.rowCount !== null && result.rowCount > 0;
  } catch (error) {
    console.error('Failed to delete post in database:', error);
    throw error;
  }
}

export async function adminDeletePost(id: string): Promise<boolean> {
  try {
    // 投稿の内容を削除メッセージに置き換え（is_deletedはfalseのまま）
    const result = await pool.query(`
      UPDATE posts
      SET
        title = '[削除されました]',
        content = '管理者が不適切とみなしたため、削除いたしました。',
        tags = '{}',
        updated_at = $1
      WHERE id = $2
    `, [new Date().toISOString(), id]);
    
    return result.rowCount !== null && result.rowCount > 0;
  } catch (error) {
    console.error('Failed to admin delete post in database:', error);
    throw error;
  }
}

export async function updatePostsByUserId(userId: string, updates: Partial<Post>): Promise<number> {
  try {
    const updatedAt = new Date().toISOString();
    const updateFields: string[] = [];
    const updateValues: any[] = [];
    let paramIndex = 1;
    
    if (updates.title !== undefined) {
      updateFields.push(`title = $${paramIndex++}`);
      updateValues.push(updates.title);
    }
    if (updates.content !== undefined) {
      updateFields.push(`content = $${paramIndex++}`);
      updateValues.push(updates.content);
    }
    if (updates.tags !== undefined) {
      updateFields.push(`tags = $${paramIndex++}`);
      updateValues.push(updates.tags);
    }
    if (updates.status !== undefined) {
      updateFields.push(`status = $${paramIndex++}`);
      updateValues.push(updates.status);
    }
    
    updateFields.push(`updated_at = $${paramIndex++}`);
    updateValues.push(updatedAt);
    updateValues.push(userId);
    
    if (updateFields.length === 1) {
      // updated_at のみの場合は何も更新しない
      return 0;
    }
    
    const result = await pool.query(`
      UPDATE posts
      SET ${updateFields.join(', ')}
      WHERE user_id = $${paramIndex}
    `, updateValues);
    
    return result.rowCount || 0;
  } catch (error) {
    console.error('Failed to update posts by user id in database:', error);
    throw error;
  }
}

// ==================== メッセージ管理 ====================

export async function getMessages(): Promise<Message[]> {
  try {
    const result = await pool.query(`
      SELECT
        id,
        conversation_id as "conversationId",
        sender_id as "senderId",
        receiver_id as "receiverId",
        content,
        is_read as "read",
        created_at as "createdAt"
      FROM messages
      ORDER BY created_at ASC
    `);
    
    return result.rows.map(row => ({
      ...row,
      read: row.read || false,
    })) as Message[];
  } catch (error) {
    console.error('Failed to get messages from database:', error);
    throw error;
  }
}

export async function getMessagesByConversationId(conversationId: string): Promise<Message[]> {
  try {
    const result = await pool.query(`
      SELECT
        id,
        conversation_id as "conversationId",
        sender_id as "senderId",
        receiver_id as "receiverId",
        content,
        is_read as "read",
        created_at as "createdAt"
      FROM messages
      WHERE conversation_id = $1
      ORDER BY created_at ASC
    `, [conversationId]);
    
    return result.rows.map(row => ({
      ...row,
      read: row.read || false,
    })) as Message[];
  } catch (error) {
    console.error('Failed to get messages by conversation id from database:', error);
    throw error;
  }
}

export async function createMessage(message: Omit<Message, 'id' | 'createdAt' | 'read'>): Promise<Message> {
  try {
    const id = Date.now().toString();
    const now = new Date().toISOString();
    
    await pool.query(`
      INSERT INTO messages (id, conversation_id, sender_id, receiver_id, content, is_read, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [
      id,
      message.conversationId,
      message.senderId,
      message.receiverId,
      message.content,
      false,
      now,
    ]);
    
    return {
      ...message,
      id,
      read: false,
      createdAt: now,
    };
  } catch (error) {
    console.error('Failed to create message in database:', error);
    throw error;
  }
}

export async function markMessagesAsRead(conversationId: string, userId: string): Promise<void> {
  try {
    await pool.query(`
      UPDATE messages
      SET is_read = true
      WHERE conversation_id = $1 AND receiver_id = $2 AND is_read = false
    `, [conversationId, userId]);
  } catch (error) {
    console.error('Failed to mark messages as read in database:', error);
    throw error;
  }
}

export async function getUnreadMessageCount(userId: string): Promise<number> {
  try {
    const result = await pool.query(`
      SELECT COUNT(*) as count
      FROM messages
      WHERE receiver_id = $1 AND is_read = false
    `, [userId]);
    
    return parseInt(result.rows[0]?.count || '0', 10);
  } catch (error) {
    console.error('Failed to get unread message count from database:', error);
    throw error;
  }
}

export async function getMessageById(id: string): Promise<Message | null> {
  try {
    const result = await pool.query(`
      SELECT
        id,
        conversation_id as "conversationId",
        sender_id as "senderId",
        receiver_id as "receiverId",
        content,
        is_read as "read",
        created_at as "createdAt"
      FROM messages
      WHERE id = $1
      LIMIT 1
    `, [id]);
    
    if (result.rows.length === 0) return null;
    
    const row = result.rows[0];
    return {
      ...row,
      read: row.read || false,
    } as Message;
  } catch (error) {
    console.error('Failed to get message by id from database:', error);
    throw error;
  }
}

export async function deleteMessage(id: string): Promise<boolean> {
  try {
    const result = await pool.query(`
      DELETE FROM messages
      WHERE id = $1
    `, [id]);
    
    return result.rowCount !== null && result.rowCount > 0;
  } catch (error) {
    console.error('Failed to delete message in database:', error);
    throw error;
  }
}

// ==================== 会話管理 ====================

export async function getConversations(): Promise<Conversation[]> {
  try {
    const result = await pool.query(`
      SELECT
        c.id,
        c.user1_id as "user1Id",
        c.user2_id as "user2Id",
        c.created_at as "createdAt",
        c.updated_at as "updatedAt",
        (
          SELECT id
          FROM messages
          WHERE conversation_id = c.id
          ORDER BY created_at DESC
          LIMIT 1
        ) as "lastMessageId",
        (
          SELECT created_at
          FROM messages
          WHERE conversation_id = c.id
          ORDER BY created_at DESC
          LIMIT 1
        ) as "lastMessageAt"
      FROM conversations c
      ORDER BY c.updated_at DESC
    `);
    
    return result.rows.map(row => ({
      id: row.id,
      participantIds: [row.user1Id, row.user2Id].sort(),
      lastMessageId: row.lastMessageId || undefined,
      lastMessageAt: row.lastMessageAt || undefined,
      createdAt: row.createdAt,
    })) as Conversation[];
  } catch (error) {
    console.error('Failed to get conversations from database:', error);
    throw error;
  }
}

export async function getConversationByParticipants(userId1: string, userId2: string): Promise<Conversation | null> {
  try {
    // 順序を問わず検索するため、両方の順序で試す
    const result = await pool.query(`
      SELECT
        c.id,
        c.user1_id as "user1Id",
        c.user2_id as "user2Id",
        c.created_at as "createdAt",
        c.updated_at as "updatedAt",
        (
          SELECT id
          FROM messages
          WHERE conversation_id = c.id
          ORDER BY created_at DESC
          LIMIT 1
        ) as "lastMessageId",
        (
          SELECT created_at
          FROM messages
          WHERE conversation_id = c.id
          ORDER BY created_at DESC
          LIMIT 1
        ) as "lastMessageAt"
      FROM conversations c
      WHERE (c.user1_id = $1 AND c.user2_id = $2)
         OR (c.user1_id = $2 AND c.user2_id = $1)
      LIMIT 1
    `, [userId1, userId2]);
    
    if (result.rows.length === 0) return null;
    
    const row = result.rows[0];
    return {
      id: row.id,
      participantIds: [row.user1Id, row.user2Id].sort(),
      lastMessageId: row.lastMessageId || undefined,
      lastMessageAt: row.lastMessageAt || undefined,
      createdAt: row.createdAt,
    } as Conversation;
  } catch (error) {
    console.error('Failed to get conversation by participants from database:', error);
    throw error;
  }
}

export async function getConversationsByUserId(userId: string): Promise<Conversation[]> {
  try {
    const result = await pool.query(`
      SELECT
        c.id,
        c.user1_id as "user1Id",
        c.user2_id as "user2Id",
        c.created_at as "createdAt",
        c.updated_at as "updatedAt",
        (
          SELECT id
          FROM messages
          WHERE conversation_id = c.id
          ORDER BY created_at DESC
          LIMIT 1
        ) as "lastMessageId",
        (
          SELECT created_at
          FROM messages
          WHERE conversation_id = c.id
          ORDER BY created_at DESC
          LIMIT 1
        ) as "lastMessageAt"
      FROM conversations c
      WHERE c.user1_id = $1 OR c.user2_id = $1
      ORDER BY COALESCE((
        SELECT created_at
        FROM messages
        WHERE conversation_id = c.id
        ORDER BY created_at DESC
        LIMIT 1
      ), c.updated_at) DESC
    `, [userId]);
    
    return result.rows.map(row => ({
      id: row.id,
      participantIds: [row.user1Id, row.user2Id].sort(),
      lastMessageId: row.lastMessageId || undefined,
      lastMessageAt: row.lastMessageAt || undefined,
      createdAt: row.createdAt,
    })) as Conversation[];
  } catch (error) {
    console.error('Failed to get conversations by user id from database:', error);
    throw error;
  }
}

export async function createConversation(participantIds: [string, string]): Promise<Conversation> {
  try {
    const id = Date.now().toString();
    const now = new Date().toISOString();
    const sortedIds = participantIds.sort();
    
    await pool.query(`
      INSERT INTO conversations (id, user1_id, user2_id, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (user1_id, user2_id) DO NOTHING
    `, [id, sortedIds[0], sortedIds[1], now, now]);
    
    // 既存の会話を取得（ON CONFLICTで挿入されなかった場合）
    const existing = await getConversationByParticipants(sortedIds[0], sortedIds[1]);
    if (existing) {
      return existing;
    }
    
    return {
      id,
      participantIds: sortedIds,
      createdAt: now,
    };
  } catch (error) {
    console.error('Failed to create conversation in database:', error);
    throw error;
  }
}

export async function updateConversation(conversationId: string, updates: Partial<Conversation>): Promise<Conversation | null> {
  try {
    // 会話の更新（主にupdated_atを更新）
    const updatedAt = new Date().toISOString();
    await pool.query(`
      UPDATE conversations
      SET updated_at = $1
      WHERE id = $2
    `, [updatedAt, conversationId]);
    
    // 更新後の会話を取得
    const result = await pool.query(`
      SELECT
        c.id,
        c.user1_id as "user1Id",
        c.user2_id as "user2Id",
        c.created_at as "createdAt",
        c.updated_at as "updatedAt",
        (
          SELECT id
          FROM messages
          WHERE conversation_id = c.id
          ORDER BY created_at DESC
          LIMIT 1
        ) as "lastMessageId",
        (
          SELECT created_at
          FROM messages
          WHERE conversation_id = c.id
          ORDER BY created_at DESC
          LIMIT 1
        ) as "lastMessageAt"
      FROM conversations c
      WHERE c.id = $1
      LIMIT 1
    `, [conversationId]);
    
    if (result.rows.length === 0) return null;
    
    const row = result.rows[0];
    return {
      id: row.id,
      participantIds: [row.user1Id, row.user2Id].sort(),
      lastMessageId: row.lastMessageId || undefined,
      lastMessageAt: row.lastMessageAt || undefined,
      createdAt: row.createdAt,
    } as Conversation;
  } catch (error) {
    console.error('Failed to update conversation in database:', error);
    throw error;
  }
}

// ==================== お知らせ管理 ====================

export async function getAnnouncements(): Promise<Announcement[]> {
  try {
    const result = await pool.query(`
      SELECT
        id,
        title,
        content,
        type,
        is_visible as "isVisible",
        published_at as "publishedAt",
        expires_at as "expiresAt",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM announcements
      ORDER BY created_at DESC
    `);
    
    return result.rows.map(row => ({
      id: row.id,
      title: row.title,
      content: row.content,
      type: row.type,
      isVisible: row.isVisible !== undefined ? row.isVisible : true,
      publishedAt: row.publishedAt || undefined,
      expiresAt: row.expiresAt || undefined,
      createdBy: '', // スキーマにcreated_byカラムがないため、空文字列
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    })) as Announcement[];
  } catch (error) {
    console.error('Failed to get announcements from database:', error);
    throw error;
  }
}

export async function getVisibleAnnouncements(): Promise<Announcement[]> {
  try {
    const now = new Date().toISOString();
    const result = await pool.query(`
      SELECT
        id,
        title,
        content,
        type,
        is_visible as "isVisible",
        published_at as "publishedAt",
        expires_at as "expiresAt",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM announcements
      WHERE is_visible = true
        AND (published_at IS NULL OR published_at <= $1)
        AND (expires_at IS NULL OR expires_at >= $1)
      ORDER BY COALESCE(published_at, created_at) DESC
    `, [now]);
    
    return result.rows.map(row => ({
      id: row.id,
      title: row.title,
      content: row.content,
      type: row.type,
      isVisible: row.isVisible !== undefined ? row.isVisible : true,
      publishedAt: row.publishedAt || undefined,
      expiresAt: row.expiresAt || undefined,
      createdBy: '', // スキーマにcreated_byカラムがないため、空文字列
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    })) as Announcement[];
  } catch (error) {
    console.error('Failed to get visible announcements from database:', error);
    throw error;
  }
}

export async function getAnnouncementById(id: string): Promise<Announcement | null> {
  try {
    const result = await pool.query(`
      SELECT
        id,
        title,
        content,
        type,
        is_visible as "isVisible",
        published_at as "publishedAt",
        expires_at as "expiresAt",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM announcements
      WHERE id = $1
      LIMIT 1
    `, [id]);
    
    if (result.rows.length === 0) return null;
    
    const row = result.rows[0];
    return {
      id: row.id,
      title: row.title,
      content: row.content,
      type: row.type,
      isVisible: row.isVisible !== undefined ? row.isVisible : true,
      publishedAt: row.publishedAt || undefined,
      expiresAt: row.expiresAt || undefined,
      createdBy: '', // スキーマにcreated_byカラムがないため、空文字列
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    } as Announcement;
  } catch (error) {
    console.error('Failed to get announcement by id from database:', error);
    throw error;
  }
}

export async function createAnnouncement(announcement: Omit<Announcement, 'id' | 'createdAt' | 'updatedAt'>): Promise<Announcement> {
  try {
    const id = Date.now().toString();
    const now = new Date().toISOString();
    
    await pool.query(`
      INSERT INTO announcements (
        id, title, content, type, is_visible, published_at, expires_at, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9
      )
    `, [
      id,
      announcement.title,
      announcement.content,
      announcement.type || 'info',
      announcement.isVisible !== undefined ? announcement.isVisible : true,
      announcement.publishedAt || null,
      announcement.expiresAt || null,
      now,
      now,
    ]);
    
    return {
      ...announcement,
      id,
      createdAt: now,
      updatedAt: now,
    } as Announcement;
  } catch (error) {
    console.error('Failed to create announcement in database:', error);
    throw error;
  }
}

export async function updateAnnouncement(id: string, updates: Partial<Announcement>): Promise<Announcement | null> {
  try {
    const updateFields: string[] = [];
    const updateValues: any[] = [];
    let paramIndex = 1;
    
    if (updates.title !== undefined) {
      updateFields.push(`title = $${paramIndex++}`);
      updateValues.push(updates.title);
    }
    if (updates.content !== undefined) {
      updateFields.push(`content = $${paramIndex++}`);
      updateValues.push(updates.content);
    }
    if (updates.type !== undefined) {
      updateFields.push(`type = $${paramIndex++}`);
      updateValues.push(updates.type);
    }
    if (updates.isVisible !== undefined) {
      updateFields.push(`is_visible = $${paramIndex++}`);
      updateValues.push(updates.isVisible);
    }
    if (updates.publishedAt !== undefined) {
      updateFields.push(`published_at = $${paramIndex++}`);
      updateValues.push(updates.publishedAt || null);
    }
    if (updates.expiresAt !== undefined) {
      updateFields.push(`expires_at = $${paramIndex++}`);
      updateValues.push(updates.expiresAt || null);
    }
    
    updateFields.push(`updated_at = $${paramIndex++}`);
    updateValues.push(new Date().toISOString());
    updateValues.push(id);
    
    if (updateFields.length === 1) {
      // updated_at のみの場合は何も更新しない
      return getAnnouncementById(id);
    }
    
    await pool.query(`
      UPDATE announcements
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
    `, updateValues);
    
    return getAnnouncementById(id);
  } catch (error) {
    console.error('Failed to update announcement in database:', error);
    throw error;
  }
}

export async function deleteAnnouncement(id: string): Promise<boolean> {
  try {
    const result = await pool.query(`
      DELETE FROM announcements
      WHERE id = $1
    `, [id]);
    
    return result.rowCount !== null && result.rowCount > 0;
  } catch (error) {
    console.error('Failed to delete announcement in database:', error);
    throw error;
  }
}

// ==================== ブロックユーザー管理 ====================

interface BlockedUser {
  userId: string;
  blockedUserId: string;
  createdAt: string;
}

export async function getBlockedUserIds(userId: string): Promise<string[]> {
  try {
    const result = await pool.query(`
      SELECT blocked_user_id as "blockedUserId"
      FROM blocked_users
      WHERE user_id = $1
    `, [userId]);
    
    return result.rows.map(row => row.blockedUserId);
  } catch (error) {
    console.error('Failed to get blocked user ids from database:', error);
    throw error;
  }
}

export async function isUserBlocked(userId: string, blockedUserId: string): Promise<boolean> {
  try {
    const result = await pool.query(`
      SELECT id
      FROM blocked_users
      WHERE user_id = $1 AND blocked_user_id = $2
      LIMIT 1
    `, [userId, blockedUserId]);
    
    return result.rows.length > 0;
  } catch (error) {
    console.error('Failed to check if user is blocked from database:', error);
    throw error;
  }
}

export async function blockUser(userId: string, blockedUserId: string): Promise<void> {
  try {
    // 既にブロックされているかチェック
    const alreadyBlocked = await isUserBlocked(userId, blockedUserId);
    if (alreadyBlocked) {
      return; // 既にブロック済み
    }
    
    const id = Date.now().toString();
    const now = new Date().toISOString();
    
    await pool.query(`
      INSERT INTO blocked_users (id, user_id, blocked_user_id, created_at)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (user_id, blocked_user_id) DO NOTHING
    `, [id, userId, blockedUserId, now]);
  } catch (error) {
    console.error('Failed to block user in database:', error);
    throw error;
  }
}

export async function unblockUser(userId: string, blockedUserId: string): Promise<void> {
  try {
    await pool.query(`
      DELETE FROM blocked_users
      WHERE user_id = $1 AND blocked_user_id = $2
    `, [userId, blockedUserId]);
  } catch (error) {
    console.error('Failed to unblock user in database:', error);
    throw error;
  }
}

// 他の関数も同様に実装する必要がありますが、まずはユーザー関連、パスワードリセットトークン、投稿、メッセージ、会話、お知らせ、ブロックユーザーを完成させます
// 残りの関数（comments, feedback等）は後で追加します

