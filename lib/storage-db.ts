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

// 他の関数も同様に実装する必要がありますが、まずはユーザー関連を完成させます
// 残りの関数（posts, comments, feedback等）は後で追加します

