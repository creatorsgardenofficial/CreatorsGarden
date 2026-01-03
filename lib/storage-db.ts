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
        deactivated_at as "deactivatedAt",
        deactivation_reason as "deactivationReason",
        subscription
      FROM users
      ORDER BY created_at DESC`
    );
    
    return result.rows.map(row => ({
      ...row,
      subscription: row.subscription || { planType: 'free', status: 'active' },
      portfolioUrls: row.portfolioUrls || undefined,
    })) as User[];
  } catch (error: any) {
    console.error('Failed to get users from database:', error);
    // Prisma Accelerateの制限エラーの場合、より明確なメッセージを表示
    if (error?.message?.includes('planLimitReached') || error?.message?.includes('account has restrictions')) {
      console.error('❌ Prisma Accelerate account limit reached');
      console.error('❌ Please configure Vercel Postgres connection string');
      console.error('❌ Go to: Vercel Dashboard → Storage → Your Database → Settings');
      console.error('❌ Copy the "Direct Connection" string and set it as POSTGRES_URL_NON_POOLING');
    }
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
        deactivated_at as "deactivatedAt",
        deactivation_reason as "deactivationReason",
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
        deactivated_at as "deactivatedAt",
        deactivation_reason as "deactivationReason",
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
        deactivated_at as "deactivatedAt",
        deactivation_reason as "deactivationReason",
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
    const deactivatedAt = updates.deactivatedAt !== undefined ? updates.deactivatedAt : existingUser.deactivatedAt;
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
         deactivated_at = $10,
         subscription = $11
       WHERE id = $12`,
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
        deactivatedAt || null,
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

// 退会処理
export async function deactivateUser(userId: string, reason?: string): Promise<User | null> {
  try {
    const deactivatedAt = new Date().toISOString();
    await pool.query(
      `UPDATE users
       SET deactivated_at = $1, deactivation_reason = $2, is_active = false
       WHERE id = $3`,
      [deactivatedAt, reason || null, userId]
    );
    return getUserById(userId);
  } catch (error) {
    console.error('Failed to deactivate user in database:', error);
    throw error;
  }
}

// アカウント復旧処理
export async function reactivateUser(userId: string): Promise<User | null> {
  try {
    await pool.query(
      `UPDATE users
       SET deactivated_at = NULL, deactivation_reason = NULL, is_active = true
       WHERE id = $1`,
      [userId]
    );
    return getUserById(userId);
  } catch (error) {
    console.error('Failed to reactivate user in database:', error);
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
    // カラムの存在を確認
    const hasUrls = await columnExists('posts', 'urls');
    const hasBumpedAt = await columnExists('posts', 'bumped_at');
    const urlsSelect = hasUrls ? 'p.urls,' : 'NULL::JSONB as urls,';
    const bumpedAtSelect = hasBumpedAt ? 'p.bumped_at as "bumpedAt",' : 'NULL::TIMESTAMP WITH TIME ZONE as "bumpedAt",';
    
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
        ${urlsSelect}
        ${bumpedAtSelect}
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
      urls: row.urls || undefined,
      bumpedAt: row.bumpedAt || undefined,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    })) as Post[];
  } catch (error) {
    console.error('Failed to get posts from database:', error);
    throw error;
  }
}

export async function getPostById(id: string): Promise<Post | null> {
  try {
    // カラムの存在を確認
    const hasUrls = await columnExists('posts', 'urls');
    const hasBumpedAt = await columnExists('posts', 'bumped_at');
    const urlsSelect = hasUrls ? 'p.urls,' : 'NULL::JSONB as urls,';
    const bumpedAtSelect = hasBumpedAt ? 'p.bumped_at as "bumpedAt",' : 'NULL::TIMESTAMP WITH TIME ZONE as "bumpedAt",';
    
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
        ${urlsSelect}
        ${bumpedAtSelect}
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
      urls: row.urls || undefined,
      bumpedAt: row.bumpedAt || undefined,
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
    
    // カラムの存在を確認
    const hasUrls = await columnExists('posts', 'urls');
    
    if (hasUrls) {
      await pool.query(`
        INSERT INTO posts (
          id, user_id, type, title, content, tags, status,
          priority_display, featured_display, likes, urls, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
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
        post.urls ? JSON.stringify(post.urls) : null,
        now,
        now,
      ]);
    } else {
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
    }
    
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
    const urls = updates.urls !== undefined ? updates.urls : existingPost.urls;
    const bumpedAt = updates.bumpedAt !== undefined ? updates.bumpedAt : existingPost.bumpedAt;
    const updatedAt = new Date().toISOString();
    
    // カラムの存在を確認
    const hasUrls = await columnExists('posts', 'urls');
    const hasBumpedAt = await columnExists('posts', 'bumped_at');
    
    if (hasUrls && hasBumpedAt) {
      await pool.query(`
        UPDATE posts
        SET
          title = $1,
          content = $2,
          tags = $3,
          status = $4,
          urls = $5,
          bumped_at = $6,
          priority_display = $7,
          featured_display = $8,
          updated_at = $9
        WHERE id = $10
      `, [
        title,
        content,
        tags || [],
        status,
        urls ? JSON.stringify(urls) : null,
        bumpedAt || null,
        priorityDisplay,
        featuredDisplay,
        updatedAt,
        id,
      ]);
    } else if (hasUrls) {
      await pool.query(`
        UPDATE posts
        SET
          title = $1,
          content = $2,
          tags = $3,
          status = $4,
          urls = $5,
          priority_display = $6,
          featured_display = $7,
          updated_at = $8
        WHERE id = $9
      `, [
        title,
        content,
        tags || [],
        status,
        urls ? JSON.stringify(urls) : null,
        priorityDisplay,
        featuredDisplay,
        updatedAt,
        id,
      ]);
    } else if (hasBumpedAt) {
      await pool.query(`
        UPDATE posts
        SET
          title = $1,
          content = $2,
          tags = $3,
          status = $4,
          bumped_at = $5,
          priority_display = $6,
          featured_display = $7,
          updated_at = $8
        WHERE id = $9
      `, [
        title,
        content,
        tags || [],
        status,
        bumpedAt || null,
        priorityDisplay,
        featuredDisplay,
        updatedAt,
        id,
      ]);
    } else {
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
    }
    
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

// ==================== グループチャット管理 ====================

// カラムの存在を確認するヘルパー関数
async function columnExists(tableName: string, columnName: string): Promise<boolean> {
  try {
    const result = await pool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = $1 AND column_name = $2
    `, [tableName, columnName]);
    return result.rows.length > 0;
  } catch {
    return false;
  }
}

export async function getGroupChats(): Promise<GroupChat[]> {
  try {
    // カラムの存在を確認
    const hasLastMessageId = await columnExists('group_chats', 'last_message_id');
    const hasLastMessageAt = await columnExists('group_chats', 'last_message_at');
    
    const lastMessageIdSelect = hasLastMessageId ? 'last_message_id as "lastMessageId",' : 'NULL as "lastMessageId",';
    const lastMessageAtSelect = hasLastMessageAt ? 'last_message_at as "lastMessageAt",' : 'NULL as "lastMessageAt",';
    const orderBy = hasLastMessageAt ? 'COALESCE(last_message_at, created_at)' : 'created_at';
    
    const result = await pool.query(`
      SELECT
        id,
        name,
        description,
        creator_id as "createdBy",
        member_ids as "participantIds",
        ${lastMessageIdSelect}
        ${lastMessageAtSelect}
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM group_chats
      ORDER BY ${orderBy} DESC
    `);

    return result.rows.map(row => ({
      ...row,
      participantIds: row.participantIds || [],
      description: row.description || undefined,
      lastMessageId: row.lastMessageId || undefined,
      lastMessageAt: row.lastMessageAt || undefined,
    })) as GroupChat[];
  } catch (error) {
    console.error('Failed to get group chats from database:', error);
    throw error;
  }
}

export async function getGroupChatById(id: string): Promise<GroupChat | null> {
  try {
    // カラムの存在を確認
    const hasLastMessageId = await columnExists('group_chats', 'last_message_id');
    const hasLastMessageAt = await columnExists('group_chats', 'last_message_at');
    
    const lastMessageIdSelect = hasLastMessageId ? 'last_message_id as "lastMessageId",' : 'NULL as "lastMessageId",';
    const lastMessageAtSelect = hasLastMessageAt ? 'last_message_at as "lastMessageAt",' : 'NULL as "lastMessageAt",';
    
    const result = await pool.query(`
      SELECT
        id,
        name,
        description,
        creator_id as "createdBy",
        member_ids as "participantIds",
        ${lastMessageIdSelect}
        ${lastMessageAtSelect}
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM group_chats
      WHERE id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      ...row,
      participantIds: row.participantIds || [],
      description: row.description || undefined,
      lastMessageId: row.lastMessageId || undefined,
      lastMessageAt: row.lastMessageAt || undefined,
    } as GroupChat;
  } catch (error) {
    console.error('Failed to get group chat by id from database:', error);
    throw error;
  }
}

export async function getGroupChatsByUserId(userId: string): Promise<GroupChat[]> {
  try {
    // カラムの存在を確認
    const hasLastMessageId = await columnExists('group_chats', 'last_message_id');
    const hasLastMessageAt = await columnExists('group_chats', 'last_message_at');
    
    const lastMessageIdSelect = hasLastMessageId ? 'last_message_id as "lastMessageId",' : 'NULL as "lastMessageId",';
    const lastMessageAtSelect = hasLastMessageAt ? 'last_message_at as "lastMessageAt",' : 'NULL as "lastMessageAt",';
    const orderBy = hasLastMessageAt ? 'COALESCE(last_message_at, created_at)' : 'created_at';
    
    const result = await pool.query(`
      SELECT
        id,
        name,
        description,
        creator_id as "createdBy",
        member_ids as "participantIds",
        ${lastMessageIdSelect}
        ${lastMessageAtSelect}
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM group_chats
      WHERE $1 = ANY(member_ids)
      ORDER BY ${orderBy} DESC
    `, [userId]);

    return result.rows.map(row => ({
      ...row,
      participantIds: row.participantIds || [],
      description: row.description || undefined,
      lastMessageId: row.lastMessageId || undefined,
      lastMessageAt: row.lastMessageAt || undefined,
    })) as GroupChat[];
  } catch (error) {
    console.error('Failed to get group chats by user id from database:', error);
    throw error;
  }
}

export async function createGroupChat(groupChat: Omit<GroupChat, 'id' | 'createdAt' | 'updatedAt'>): Promise<GroupChat> {
  try {
    const id = Date.now().toString();
    const now = new Date().toISOString();
    
    // カラムの存在を確認
    const hasLastMessageId = await columnExists('group_chats', 'last_message_id');
    const hasLastMessageAt = await columnExists('group_chats', 'last_message_at');
    
    let columns = 'id, name, description, creator_id, member_ids';
    let values = [id, groupChat.name, groupChat.description || null, groupChat.createdBy, groupChat.participantIds];
    let paramIndex = 6;
    
    if (hasLastMessageId) {
      columns += ', last_message_id';
      values.push(groupChat.lastMessageId || null);
      paramIndex++;
    }
    if (hasLastMessageAt) {
      columns += ', last_message_at';
      values.push(groupChat.lastMessageAt || null);
      paramIndex++;
    }
    
    columns += ', created_at, updated_at';
    values.push(now, now);
    
    await pool.query(`
      INSERT INTO group_chats (${columns})
      VALUES (${values.map((_, i) => `$${i + 1}`).join(', ')})
    `, values);

    return {
      ...groupChat,
      id,
      createdAt: now,
      updatedAt: now,
    };
  } catch (error) {
    console.error('Failed to create group chat in database:', error);
    throw error;
  }
}

export async function updateGroupChat(id: string, updates: Partial<GroupChat>): Promise<GroupChat | null> {
  try {
    // カラムの存在を確認
    const hasLastMessageId = await columnExists('group_chats', 'last_message_id');
    const hasLastMessageAt = await columnExists('group_chats', 'last_message_at');
    
    const updateFields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.name !== undefined) {
      updateFields.push(`name = $${paramIndex++}`);
      values.push(updates.name);
    }
    if (updates.description !== undefined) {
      updateFields.push(`description = $${paramIndex++}`);
      values.push(updates.description || null);
    }
    if (updates.participantIds !== undefined) {
      updateFields.push(`member_ids = $${paramIndex++}`);
      values.push(updates.participantIds);
    }
    if (updates.lastMessageId !== undefined && hasLastMessageId) {
      updateFields.push(`last_message_id = $${paramIndex++}`);
      values.push(updates.lastMessageId || null);
    }
    if (updates.lastMessageAt !== undefined && hasLastMessageAt) {
      updateFields.push(`last_message_at = $${paramIndex++}`);
      values.push(updates.lastMessageAt || null);
    }

    if (updateFields.length === 0) {
      return await getGroupChatById(id);
    }

    updateFields.push(`updated_at = $${paramIndex++}`);
    values.push(new Date().toISOString());
    values.push(id);

    await pool.query(`
      UPDATE group_chats
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
    `, values);

    return await getGroupChatById(id);
  } catch (error) {
    console.error('Failed to update group chat in database:', error);
    throw error;
  }
}

export async function addParticipantToGroupChat(groupChatId: string, userId: string): Promise<GroupChat | null> {
  try {
    const groupChat = await getGroupChatById(groupChatId);
    if (!groupChat) return null;
    
    if (groupChat.participantIds.includes(userId)) {
      return groupChat; // 既に参加している
    }

    const updatedParticipantIds = [...groupChat.participantIds, userId];
    return await updateGroupChat(groupChatId, {
      participantIds: updatedParticipantIds,
    });
  } catch (error) {
    console.error('Failed to add participant to group chat in database:', error);
    throw error;
  }
}

export async function removeParticipantFromGroupChat(groupChatId: string, userId: string): Promise<GroupChat | null> {
  try {
    const groupChat = await getGroupChatById(groupChatId);
    if (!groupChat) return null;

    const updatedParticipantIds = groupChat.participantIds.filter(id => id !== userId);
    return await updateGroupChat(groupChatId, {
      participantIds: updatedParticipantIds,
    });
  } catch (error) {
    console.error('Failed to remove participant from group chat in database:', error);
    throw error;
  }
}

// ==================== グループメッセージ管理 ====================

export async function getGroupMessages(): Promise<GroupMessage[]> {
  try {
    const result = await pool.query(`
      SELECT
        gm.id,
        gm.group_chat_id as "groupChatId",
        gm.user_id as "senderId",
        gm.sender_username as "senderUsername",
        gm.content,
        gm.read_by as "readBy",
        gm.created_at as "createdAt",
        gm.updated_at as "updatedAt"
      FROM group_messages gm
      ORDER BY gm.created_at ASC
    `);

    return result.rows.map(row => ({
      ...row,
      readBy: row.readBy || [],
      updatedAt: row.updatedAt || undefined,
    })) as GroupMessage[];
  } catch (error) {
    console.error('Failed to get group messages from database:', error);
    throw error;
  }
}

export async function getGroupMessagesByGroupChatId(groupChatId: string): Promise<GroupMessage[]> {
  try {
    const result = await pool.query(`
      SELECT
        gm.id,
        gm.group_chat_id as "groupChatId",
        gm.user_id as "senderId",
        gm.sender_username as "senderUsername",
        gm.content,
        gm.read_by as "readBy",
        gm.created_at as "createdAt",
        gm.updated_at as "updatedAt"
      FROM group_messages gm
      WHERE gm.group_chat_id = $1
      ORDER BY gm.created_at ASC
    `, [groupChatId]);

    return result.rows.map(row => ({
      ...row,
      readBy: row.readBy || [],
      updatedAt: row.updatedAt || undefined,
    })) as GroupMessage[];
  } catch (error) {
    console.error('Failed to get group messages by group chat id from database:', error);
    throw error;
  }
}

export async function createGroupMessage(message: Omit<GroupMessage, 'id' | 'createdAt' | 'readBy'>): Promise<GroupMessage> {
  try {
    const id = Date.now().toString();
    const now = new Date().toISOString();
    const readBy = [message.senderId]; // 送信者は自動的に既読
    
    await pool.query(`
      INSERT INTO group_messages (
        id, group_chat_id, user_id, sender_username, content, read_by, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [
      id,
      message.groupChatId,
      message.senderId,
      message.senderUsername,
      message.content,
      readBy,
      now,
    ]);

    return {
      ...message,
      id,
      readBy,
      createdAt: now,
    };
  } catch (error) {
    console.error('Failed to create group message in database:', error);
    throw error;
  }
}

export async function markGroupMessageAsRead(messageId: string, userId: string): Promise<void> {
  try {
    const message = await getGroupMessageById(messageId);
    if (!message) {
      console.log(`[markGroupMessageAsRead] Message ${messageId} not found`);
      return;
    }
    
    if (message.readBy && message.readBy.includes(userId)) {
      console.log(`[markGroupMessageAsRead] Message ${messageId} already read by user ${userId}`);
      return; // 既に既読
    }

    const updatedReadBy = [...(message.readBy || []), userId];
    await pool.query(`
      UPDATE group_messages
      SET read_by = $1
      WHERE id = $2
    `, [updatedReadBy, messageId]);
    console.log(`[markGroupMessageAsRead] Marked message ${messageId} as read for user ${userId}, readBy: ${JSON.stringify(updatedReadBy)}`);
  } catch (error) {
    console.error('Failed to mark group message as read in database:', error);
    throw error;
  }
}

export async function getGroupMessageById(id: string): Promise<GroupMessage | null> {
  try {
    const result = await pool.query(`
      SELECT
        gm.id,
        gm.group_chat_id as "groupChatId",
        gm.user_id as "senderId",
        gm.sender_username as "senderUsername",
        gm.content,
        gm.read_by as "readBy",
        gm.created_at as "createdAt",
        gm.updated_at as "updatedAt"
      FROM group_messages gm
      WHERE gm.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      ...row,
      readBy: row.readBy || [],
      updatedAt: row.updatedAt || undefined,
    } as GroupMessage;
  } catch (error) {
    console.error('Failed to get group message by id from database:', error);
    throw error;
  }
}

export async function updateGroupMessage(id: string, updates: Partial<GroupMessage>): Promise<GroupMessage | null> {
  try {
    const updateFields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.content !== undefined) {
      updateFields.push(`content = $${paramIndex++}`);
      values.push(updates.content);
    }
    if (updates.readBy !== undefined) {
      updateFields.push(`read_by = $${paramIndex++}`);
      values.push(updates.readBy);
    }

    if (updateFields.length === 0) {
      return await getGroupMessageById(id);
    }

    // updated_atは常に更新
    updateFields.push(`updated_at = $${paramIndex++}`);
    values.push(new Date().toISOString());
    values.push(id);

    await pool.query(`
      UPDATE group_messages
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
    `, values);

    return await getGroupMessageById(id);
  } catch (error) {
    console.error('Failed to update group message in database:', error);
    throw error;
  }
}

export async function deleteGroupMessage(id: string): Promise<boolean> {
  try {
    const result = await pool.query(`
      DELETE FROM group_messages
      WHERE id = $1
    `, [id]);

    return result.rowCount !== null && result.rowCount > 0;
  } catch (error) {
    console.error('Failed to delete group message in database:', error);
    throw error;
  }
}

// ==================== システム設定（メンテナンスモード） ====================

export interface SystemSettings {
  id: string;
  isMaintenance: boolean;
  maintenanceMessage: string | null;
  updatedAt: string;
}

export async function getSystemSettings(): Promise<SystemSettings | null> {
  try {
    // テーブルが存在しない場合は作成を試みる
    await pool.query(`
      CREATE TABLE IF NOT EXISTS system_settings (
        id TEXT PRIMARY KEY DEFAULT 'maintenance',
        is_maintenance BOOLEAN DEFAULT false,
        maintenance_message TEXT,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    const result = await pool.query(`
      SELECT
        id,
        is_maintenance as "isMaintenance",
        maintenance_message as "maintenanceMessage",
        updated_at as "updatedAt"
      FROM system_settings
      WHERE id = 'maintenance'
      LIMIT 1
    `);

    if (result.rows.length === 0) {
      // 初期データを挿入
      await pool.query(`
        INSERT INTO system_settings (id, is_maintenance, maintenance_message, updated_at)
        VALUES ('maintenance', false, '現在メンテナンス中です。ご迷惑をおかけいたします。', NOW())
        ON CONFLICT (id) DO NOTHING
      `);
      
      // デフォルト値を返す
      return {
        id: 'maintenance',
        isMaintenance: false,
        maintenanceMessage: '現在メンテナンス中です。ご迷惑をおかけいたします。',
        updatedAt: new Date().toISOString(),
      };
    }

    return result.rows[0] as SystemSettings;
  } catch (error) {
    console.error('Failed to get system settings from database:', error);
    // エラー時はメンテナンスモードOFFを返す
    return {
      id: 'maintenance',
      isMaintenance: false,
      maintenanceMessage: '現在メンテナンス中です。ご迷惑をおかけいたします。',
      updatedAt: new Date().toISOString(),
    };
  }
}

export async function updateSystemSettings(settings: Partial<SystemSettings>): Promise<SystemSettings> {
  try {
    // テーブルが存在しない場合は作成を試みる
    await pool.query(`
      CREATE TABLE IF NOT EXISTS system_settings (
        id TEXT PRIMARY KEY DEFAULT 'maintenance',
        is_maintenance BOOLEAN DEFAULT false,
        maintenance_message TEXT,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // 現在の設定を取得（存在しない場合はデフォルト値を使用）
    const currentSettings = await getSystemSettings();
    const isMaintenance = settings.isMaintenance !== undefined 
      ? settings.isMaintenance 
      : (currentSettings?.isMaintenance ?? false);
    const maintenanceMessage = settings.maintenanceMessage !== undefined
      ? settings.maintenanceMessage
      : (currentSettings?.maintenanceMessage ?? '現在メンテナンス中です。ご迷惑をおかけいたします。');
    const updatedAt = new Date().toISOString();

    // UPSERT処理
    await pool.query(`
      INSERT INTO system_settings (id, is_maintenance, maintenance_message, updated_at)
      VALUES ('maintenance', $1, $2, $3)
      ON CONFLICT (id) DO UPDATE
      SET is_maintenance = $1,
          maintenance_message = $2,
          updated_at = $3
    `, [
      isMaintenance,
      maintenanceMessage || null,
      updatedAt,
    ]);

    return await getSystemSettings() || {
      id: 'maintenance',
      isMaintenance: false,
      maintenanceMessage: '現在メンテナンス中です。ご迷惑をおかけいたします。',
      updatedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Failed to update system settings in database:', error);
    throw error;
  }
}

// ==================== フィードバック管理 ====================

export async function getFeedbacks(): Promise<Feedback[]> {
  try {
    const result = await pool.query(`
      SELECT
        id,
        user_id as "userId",
        subject,
        content as "message",
        status,
        reply,
        replied_by as "repliedBy",
        replied_at as "repliedAt",
        messages,
        created_at as "createdAt"
      FROM feedback
      ORDER BY created_at DESC
    `);
    
    return result.rows.map(row => ({
      id: row.id,
      userId: row.userId || undefined,
      subject: row.subject,
      message: row.message,
      messages: row.messages || undefined,
      reply: row.reply || undefined,
      repliedAt: row.repliedAt || undefined,
      repliedBy: row.repliedBy || undefined,
      createdAt: row.createdAt,
    })) as Feedback[];
  } catch (error) {
    console.error('Failed to get feedbacks from database:', error);
    throw error;
  }
}

export async function createFeedback(feedback: Omit<Feedback, 'id' | 'createdAt'>): Promise<Feedback> {
  try {
    const id = Date.now().toString();
    const createdAt = new Date().toISOString();
    
    // user_idはオプショナル（匿名フィードバック対応）
    // スキーマを修正してuser_idをNULL許可にする必要があります
    // 修正前: user_id TEXT NOT NULL
    // 修正後: user_id TEXT (NULL許可)
    const userId = feedback.userId || null;
    
    await pool.query(`
      INSERT INTO feedback (
        id, user_id, subject, content, status, messages, created_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7
      )
    `, [
      id,
      userId,
      feedback.subject,
      feedback.message,
      'open',
      JSON.stringify(feedback.messages || []),
      createdAt,
    ]);
    
    return {
      ...feedback,
      id,
      createdAt,
    } as Feedback;
  } catch (error) {
    console.error('Failed to create feedback in database:', error);
    throw error;
  }
}

export async function getFeedbackById(id: string): Promise<Feedback | null> {
  try {
    const result = await pool.query(`
      SELECT
        id,
        user_id as "userId",
        subject,
        content as "message",
        status,
        reply,
        replied_by as "repliedBy",
        replied_at as "repliedAt",
        messages,
        created_at as "createdAt"
      FROM feedback
      WHERE id = $1
      LIMIT 1
    `, [id]);
    
    if (result.rows.length === 0) return null;
    
    const row = result.rows[0];
    return {
      id: row.id,
      userId: row.userId || undefined,
      subject: row.subject,
      message: row.message,
      messages: row.messages || undefined,
      reply: row.reply || undefined,
      repliedAt: row.repliedAt || undefined,
      repliedBy: row.repliedBy || undefined,
      createdAt: row.createdAt,
    } as Feedback;
  } catch (error) {
    console.error('Failed to get feedback by id from database:', error);
    throw error;
  }
}

export async function updateFeedback(id: string, updates: Partial<Feedback>): Promise<Feedback | null> {
  try {
    const existingFeedback = await getFeedbackById(id);
    if (!existingFeedback) return null;
    
    const updateFields: string[] = [];
    const updateValues: any[] = [];
    let paramIndex = 1;
    
    if (updates.reply !== undefined) {
      updateFields.push(`reply = $${paramIndex++}`);
      updateValues.push(updates.reply);
    }
    
    if (updates.repliedBy !== undefined) {
      updateFields.push(`replied_by = $${paramIndex++}`);
      updateValues.push(updates.repliedBy);
    }
    
    if (updates.repliedAt !== undefined) {
      updateFields.push(`replied_at = $${paramIndex++}`);
      updateValues.push(updates.repliedAt);
    }
    
    if (updates.messages !== undefined) {
      updateFields.push(`messages = $${paramIndex++}`);
      updateValues.push(JSON.stringify(updates.messages));
    }
    
    if (updates.subject !== undefined) {
      updateFields.push(`subject = $${paramIndex++}`);
      updateValues.push(updates.subject);
    }
    
    if (updates.message !== undefined) {
      updateFields.push(`content = $${paramIndex++}`);
      updateValues.push(updates.message);
    }
    
    if (updateFields.length === 0) {
      return existingFeedback;
    }
    
    updateFields.push(`updated_at = NOW()`);
    updateValues.push(id);
    
    await pool.query(`
      UPDATE feedback
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
    `, updateValues);
    
    return await getFeedbackById(id);
  } catch (error) {
    console.error('Failed to update feedback in database:', error);
    throw error;
  }
}

export async function deleteFeedback(id: string): Promise<boolean> {
  try {
    const result = await pool.query(`
      DELETE FROM feedback
      WHERE id = $1
    `, [id]);
    
    return result.rowCount !== null && result.rowCount > 0;
  } catch (error) {
    console.error('Failed to delete feedback in database:', error);
    throw error;
  }
}

// ==================== アクセスログ管理 ====================

export interface AccessLog {
  id: string;
  path: string;
  method: string;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  referer?: string;
  createdAt: string;
}

/**
 * アクセスログを記録
 */
export async function createAccessLog(log: Omit<AccessLog, 'id' | 'createdAt'>): Promise<void> {
  try {
    const id = crypto.randomUUID();
    await pool.query(`
      INSERT INTO access_logs (id, path, method, user_id, ip_address, user_agent, referer, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
    `, [
      id,
      log.path,
      log.method,
      log.userId || null,
      log.ipAddress || null,
      log.userAgent || null,
      log.referer || null,
    ]);
  } catch (error) {
    console.error('Failed to create access log:', error);
    // エラーが発生しても処理を続行（アクセスログの記録失敗でサイトが停止しないように）
  }
}

/**
 * アクセス統計を取得
 */
export async function getAccessStats(options: {
  startDate?: string;
  endDate?: string;
  path?: string;
} = {}): Promise<{
  totalViews: number;
  uniqueVisitors: number;
  viewsByPath: Array<{ path: string; count: number }>;
  viewsByDate: Array<{ date: string; count: number }>;
  viewsByHour: Array<{ hour: number; count: number }>;
  topUserAgents: Array<{ userAgent: string; count: number }>;
  topReferers: Array<{ referer: string; count: number }>;
}> {
  try {
    // テーブルが存在するかチェック
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'access_logs'
      );
    `);
    
    if (!tableCheck.rows[0].exists) {
      console.warn('⚠️ access_logsテーブルが存在しません。SQLスクリプトを実行してください: scripts/add-access-logs-table.sql');
      return {
        totalViews: 0,
        uniqueVisitors: 0,
        viewsByPath: [],
        viewsByDate: [],
        viewsByHour: [],
        topUserAgents: [],
        topReferers: [],
      };
    }
    const { startDate, endDate, path } = options;
    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (startDate) {
      whereClause += ` AND created_at >= $${paramIndex++}`;
      params.push(startDate);
    }
    if (endDate) {
      whereClause += ` AND created_at <= $${paramIndex++}`;
      params.push(endDate);
    }
    if (path) {
      whereClause += ` AND path = $${paramIndex++}`;
      params.push(path);
    }

    // 総アクセス数
    const totalResult = await pool.query(`
      SELECT COUNT(*) as count
      FROM access_logs
      ${whereClause}
    `, params);
    const totalViews = parseInt(totalResult.rows[0].count) || 0;

    // ユニークビジター数（IPアドレスベース）
    const uniqueResult = await pool.query(`
      SELECT COUNT(DISTINCT ip_address) as count
      FROM access_logs
      ${whereClause}
      AND ip_address IS NOT NULL
    `, params);
    const uniqueVisitors = parseInt(uniqueResult.rows[0].count) || 0;

    // パス別アクセス数
    const pathResult = await pool.query(`
      SELECT path, COUNT(*) as count
      FROM access_logs
      ${whereClause}
      GROUP BY path
      ORDER BY count DESC
      LIMIT 20
    `, params);
    const viewsByPath = pathResult.rows.map((row: any) => ({
      path: row.path,
      count: parseInt(row.count) || 0,
    }));

    // 日付別アクセス数
    const dateResult = await pool.query(`
      SELECT DATE(created_at) as date, COUNT(*) as count
      FROM access_logs
      ${whereClause}
      GROUP BY DATE(created_at)
      ORDER BY date DESC
      LIMIT 30
    `, params);
    const viewsByDate = dateResult.rows.map((row: any) => ({
      date: row.date,
      count: parseInt(row.count) || 0,
    }));

    // 時間別アクセス数
    const hourResult = await pool.query(`
      SELECT EXTRACT(HOUR FROM created_at)::INTEGER as hour, COUNT(*) as count
      FROM access_logs
      ${whereClause}
      GROUP BY EXTRACT(HOUR FROM created_at)
      ORDER BY hour
    `, params);
    const viewsByHour = hourResult.rows.map((row: any) => ({
      hour: parseInt(row.hour) || 0,
      count: parseInt(row.count) || 0,
    }));

    // トップユーザーエージェント
    const userAgentResult = await pool.query(`
      SELECT user_agent, COUNT(*) as count
      FROM access_logs
      ${whereClause}
      AND user_agent IS NOT NULL
      GROUP BY user_agent
      ORDER BY count DESC
      LIMIT 10
    `, params);
    const topUserAgents = userAgentResult.rows.map((row: any) => ({
      userAgent: row.user_agent,
      count: parseInt(row.count) || 0,
    }));

    // トップリファラー
    const refererResult = await pool.query(`
      SELECT referer, COUNT(*) as count
      FROM access_logs
      ${whereClause}
      AND referer IS NOT NULL
      GROUP BY referer
      ORDER BY count DESC
      LIMIT 10
    `, params);
    const topReferers = refererResult.rows.map((row: any) => ({
      referer: row.referer,
      count: parseInt(row.count) || 0,
    }));

    return {
      totalViews,
      uniqueVisitors,
      viewsByPath,
      viewsByDate,
      viewsByHour,
      topUserAgents,
      topReferers,
    };
  } catch (error: any) {
    console.error('Failed to get access stats:', error);
    // テーブルが存在しないエラーの場合、より明確なメッセージを表示
    if (error?.message?.includes('does not exist') || error?.code === '42P01' || error?.message?.includes('relation "access_logs" does not exist')) {
      console.error('⚠️ access_logsテーブルが存在しません。');
      console.error('📋 以下のSQLスクリプトを実行してください: scripts/add-access-logs-table.sql');
    }
    return {
      totalViews: 0,
      uniqueVisitors: 0,
      viewsByPath: [],
      viewsByDate: [],
      viewsByHour: [],
      topUserAgents: [],
      topReferers: [],
    };
  }
}

