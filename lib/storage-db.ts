import { sql, shouldUseDatabase } from './db';
import { User, Post, Comment, Feedback, Message, Conversation, GroupMessage, GroupChat, Bookmark, PasswordResetToken, Announcement } from '@/types';

/**
 * PostgreSQL対応のストレージ実装
 * データベースが利用可能な場合に使用
 */

// ==================== ユーザー管理 ====================

export async function getUsers(): Promise<User[]> {
  if (!shouldUseDatabase()) {
    // フォールバック: ファイルシステムストレージを使用
    const { getUsers: getUsersFile } = await import('./storage');
    return getUsersFile();
  }

  try {
    const result = await sql`
      SELECT 
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
      ORDER BY created_at DESC
    `;
    
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
  if (!shouldUseDatabase()) {
    const { getUserById: getUserByIdFile } = await import('./storage');
    return getUserByIdFile(id);
  }

  try {
    const result = await sql`
      SELECT 
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
      WHERE id = ${id}
      LIMIT 1
    `;
    
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
  if (!shouldUseDatabase()) {
    const { getUserByEmail: getUserByEmailFile } = await import('./storage');
    return getUserByEmailFile(email);
  }

  try {
    const result = await sql`
      SELECT 
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
      WHERE email = ${email}
      LIMIT 1
    `;
    
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
  if (!shouldUseDatabase()) {
    const { getUserByPublicId: getUserByPublicIdFile } = await import('./storage');
    return getUserByPublicIdFile(publicId);
  }

  try {
    const result = await sql`
      SELECT 
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
      WHERE public_id = ${publicId}
        AND (is_active IS NULL OR is_active = true)
      LIMIT 1
    `;
    
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
    
    if (shouldUseDatabase()) {
      const result = await sql`SELECT id FROM users WHERE public_id = ${publicId} LIMIT 1`;
      if (result.rows.length === 0) break;
    } else {
      const { getUsers } = await import('./storage');
      const users = await getUsers();
      if (!users.some(u => u.publicId === publicId)) break;
    }
  } while (true);
  
  return publicId;
}

export async function createUser(user: Omit<User, 'id' | 'createdAt' | 'publicId'>): Promise<User> {
  if (!shouldUseDatabase()) {
    const { createUser: createUserFile } = await import('./storage');
    return createUserFile(user);
  }

  try {
    const publicId = await generateUniquePublicId();
    const id = Date.now().toString();
    const createdAt = new Date().toISOString();
    const subscription = user.subscription || { planType: 'free', status: 'active' };
    
    await sql`
      INSERT INTO users (
        id, username, email, password, creator_type, bio, portfolio_urls,
        is_active, public_id, created_at, subscription
      ) VALUES (
        ${id},
        ${user.username},
        ${user.email},
        ${user.password},
        ${user.creatorType},
        ${user.bio || null},
        ${JSON.stringify(user.portfolioUrls || null)},
        ${user.isActive !== undefined ? user.isActive : true},
        ${publicId},
        ${createdAt},
        ${JSON.stringify(subscription)}
      )
    `;
    
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
  if (!shouldUseDatabase()) {
    const { updateUser: updateUserFile } = await import('./storage');
    return updateUserFile(id, updates);
  }

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
    
    await sql`
      UPDATE users 
      SET 
        username = ${username},
        email = ${email},
        password = ${password},
        creator_type = ${creatorType},
        bio = ${bio || null},
        portfolio_urls = ${JSON.stringify(portfolioUrls || null)},
        is_active = ${isActive !== undefined ? isActive : true},
        failed_login_attempts = ${failedLoginAttempts || 0},
        account_locked_until = ${accountLockedUntil || null},
        subscription = ${JSON.stringify(subscription)}
      WHERE id = ${id}
    `;
    
    return getUserById(id);
  } catch (error) {
    console.error('Failed to update user in database:', error);
    throw error;
  }
}

// 他の関数も同様に実装する必要がありますが、まずはユーザー関連を完成させます
// 残りの関数（posts, comments, feedback等）は後で追加します

