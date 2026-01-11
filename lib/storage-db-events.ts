import { pool } from './db';
import { Event, Comment } from '@/types';
import { getUserById } from './storage-db';

// ==================== イベント管理 ====================

/**
 * すべてのイベントを取得（削除されていないもののみ）
 */
export async function getEvents(): Promise<Event[]> {
  try {
    const result = await pool.query(`
      SELECT
        e.id,
        e.user_id as "userId",
        u.username,
        u.creator_type as "creatorType",
        e.name,
        e.content,
        e.start_date as "startDate",
        e.end_date as "endDate",
        e.status,
        e.likes,
        e.bumped_at as "bumpedAt",
        e.created_at as "createdAt",
        e.updated_at as "updatedAt"
      FROM events e
      JOIN users u ON e.user_id = u.id
      WHERE e.is_deleted = false
      ORDER BY 
        CASE WHEN e.bumped_at IS NOT NULL THEN 0 ELSE 1 END,
        e.bumped_at DESC NULLS LAST,
        e.created_at DESC
    `);
    
    // URLを取得
    const events = await Promise.all(result.rows.map(async (row) => {
      const urlsResult = await pool.query(`
        SELECT url, description, display_order
        FROM event_urls
        WHERE event_id = $1
        ORDER BY display_order ASC
      `, [row.id]);
      
      const urls = urlsResult.rows.map(r => ({
        url: r.url,
        description: r.description || undefined,
      }));
      
      return {
        id: row.id,
        userId: row.userId,
        username: row.username,
        creatorType: row.creatorType,
        name: row.name,
        content: row.content,
        startDate: row.startDate,
        endDate: row.endDate,
        status: row.status,
        urls: urls.length > 0 ? urls : undefined,
        likes: row.likes || [],
        bumpedAt: row.bumpedAt || undefined,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      } as Event;
    }));
    
    return events;
  } catch (error) {
    console.error('Failed to get events from database:', error);
    throw error;
  }
}

/**
 * IDでイベントを取得
 */
export async function getEventById(id: string): Promise<Event | null> {
  try {
    const result = await pool.query(`
      SELECT
        e.id,
        e.user_id as "userId",
        u.username,
        u.creator_type as "creatorType",
        e.name,
        e.content,
        e.start_date as "startDate",
        e.end_date as "endDate",
        e.status,
        e.likes,
        e.bumped_at as "bumpedAt",
        e.created_at as "createdAt",
        e.updated_at as "updatedAt"
      FROM events e
      JOIN users u ON e.user_id = u.id
      WHERE e.id = $1 AND e.is_deleted = false
    `, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const row = result.rows[0];
    
    // URLを取得
    const urlsResult = await pool.query(`
      SELECT url, description, display_order
      FROM event_urls
      WHERE event_id = $1
      ORDER BY display_order ASC
    `, [id]);
    
    const urls = urlsResult.rows.map(r => ({
      url: r.url,
      description: r.description || undefined,
    }));
    
    return {
      id: row.id,
      userId: row.userId,
      username: row.username,
      creatorType: row.creatorType,
      name: row.name,
      content: row.content,
      startDate: row.startDate,
      endDate: row.endDate,
      status: row.status,
      urls: urls.length > 0 ? urls : undefined,
      likes: row.likes || [],
      bumpedAt: row.bumpedAt || undefined,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    } as Event;
  } catch (error) {
    console.error('Failed to get event by id from database:', error);
    throw error;
  }
}

/**
 * イベントを作成
 */
export async function createEvent(event: Omit<Event, 'id' | 'createdAt' | 'updatedAt' | 'likes' | 'username' | 'creatorType'>): Promise<Event> {
  try {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    
    // ユーザー情報を取得
    const user = await getUserById(event.userId);
    if (!user) {
      throw new Error('User not found');
    }
    
    // イベントを作成
    await pool.query(`
      INSERT INTO events (
        id, user_id, name, content, start_date, end_date, status, likes, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
      )
    `, [
      id,
      event.userId,
      event.name,
      event.content,
      event.startDate,
      event.endDate,
      event.status || 'open',
      [],
      now,
      now,
    ]);
    
    // URLを保存（最大3つまで）
    if (event.urls && event.urls.length > 0) {
      const urlsToInsert = event.urls.slice(0, 3); // 最大3つまで
      for (let i = 0; i < urlsToInsert.length; i++) {
        const urlData = urlsToInsert[i];
        const urlId = crypto.randomUUID();
        await pool.query(`
          INSERT INTO event_urls (id, event_id, url, description, display_order)
          VALUES ($1, $2, $3, $4, $5)
        `, [
          urlId,
          id,
          urlData.url,
          urlData.description || null,
          i,
        ]);
      }
    }
    
    return {
      ...event,
      id,
      username: user.username,
      creatorType: user.creatorType,
      likes: [],
      createdAt: now,
      updatedAt: now,
    } as Event;
  } catch (error) {
    console.error('Failed to create event in database:', error);
    throw error;
  }
}

/**
 * イベントを更新
 */
export async function updateEvent(id: string, updates: Partial<Event>): Promise<Event | null> {
  try {
    const existingEvent = await getEventById(id);
    if (!existingEvent) return null;
    
    const name = updates.name !== undefined ? updates.name : existingEvent.name;
    const content = updates.content !== undefined ? updates.content : existingEvent.content;
    const startDate = updates.startDate !== undefined ? updates.startDate : existingEvent.startDate;
    const endDate = updates.endDate !== undefined ? updates.endDate : existingEvent.endDate;
    const status = updates.status !== undefined ? updates.status : existingEvent.status;
    const updatedAt = new Date().toISOString();
    
    // イベントを更新
    await pool.query(`
      UPDATE events
      SET
        name = $1,
        content = $2,
        start_date = $3,
        end_date = $4,
        status = $5,
        updated_at = $6
      WHERE id = $7
    `, [
      name,
      content,
      startDate,
      endDate,
      status,
      updatedAt,
      id,
    ]);
    
    // URLを更新（既存のURLを削除してから新しいURLを追加）
    if (updates.urls !== undefined) {
      // 既存のURLを削除
      await pool.query(`
        DELETE FROM event_urls WHERE event_id = $1
      `, [id]);
      
      // 新しいURLを追加（最大3つまで）
      if (updates.urls.length > 0) {
        const urlsToInsert = updates.urls.slice(0, 3);
        for (let i = 0; i < urlsToInsert.length; i++) {
          const urlData = urlsToInsert[i];
          const urlId = crypto.randomUUID();
          await pool.query(`
            INSERT INTO event_urls (id, event_id, url, description, display_order)
            VALUES ($1, $2, $3, $4, $5)
          `, [
            urlId,
            id,
            urlData.url,
            urlData.description || null,
            i,
          ]);
        }
      }
    }
    
    return await getEventById(id);
  } catch (error) {
    console.error('Failed to update event in database:', error);
    throw error;
  }
}

/**
 * イベントを削除（論理削除）
 */
export async function deleteEvent(id: string, userId: string): Promise<boolean> {
  try {
    const result = await pool.query(`
      UPDATE events
      SET
        is_deleted = true,
        deleted_at = NOW(),
        deleted_by = $1
      WHERE id = $2 AND user_id = $1
    `, [userId, id]);
    
    return result.rowCount !== null && result.rowCount > 0;
  } catch (error) {
    console.error('Failed to delete event in database:', error);
    throw error;
  }
}

/**
 * イベントの挙げ機能（24時間クールタイム）
 */
export async function bumpEvent(eventId: string, userId: string): Promise<Event | null> {
  try {
    // 最後に挙げた時刻を確認
    const lastBumpResult = await pool.query(`
      SELECT bumped_at
      FROM event_bumps
      WHERE event_id = $1 AND user_id = $2
      ORDER BY bumped_at DESC
      LIMIT 1
    `, [eventId, userId]);
    
    if (lastBumpResult.rows.length > 0) {
      const lastBumpAt = new Date(lastBumpResult.rows[0].bumped_at);
      const now = new Date();
      const hoursSinceLastBump = (now.getTime() - lastBumpAt.getTime()) / (1000 * 60 * 60);
      
      if (hoursSinceLastBump < 24) {
        throw new Error('24時間以内に既に挙げています');
      }
    }
    
    // 挙げ履歴を記録
    const bumpId = crypto.randomUUID();
    await pool.query(`
      INSERT INTO event_bumps (id, event_id, user_id, bumped_at)
      VALUES ($1, $2, $3, NOW())
      ON CONFLICT (event_id, user_id) 
      DO UPDATE SET bumped_at = NOW()
    `, [bumpId, eventId, userId]);
    
    // イベントのbumped_atを更新
    await pool.query(`
      UPDATE events
      SET bumped_at = NOW()
      WHERE id = $1
    `, [eventId]);
    
    return await getEventById(eventId);
  } catch (error) {
    console.error('Failed to bump event in database:', error);
    throw error;
  }
}

/**
 * イベントのイイね機能
 */
export async function toggleEventLike(eventId: string, userId: string): Promise<Event | null> {
  try {
    const event = await getEventById(eventId);
    if (!event) return null;
    
    const likes = event.likes || [];
    const isLiked = likes.includes(userId);
    
    let newLikes: string[];
    if (isLiked) {
      newLikes = likes.filter(id => id !== userId);
    } else {
      newLikes = [...likes, userId];
    }
    
    await pool.query(`
      UPDATE events
      SET likes = $1
      WHERE id = $2
    `, [newLikes, eventId]);
    
    return await getEventById(eventId);
  } catch (error) {
    console.error('Failed to toggle event like in database:', error);
    throw error;
  }
}

/**
 * 開催期間が終了したイベントのステータスを自動的にcloseに変更
 */
export async function closeExpiredEvents(): Promise<number> {
  try {
    const result = await pool.query(`
      UPDATE events
      SET status = 'close'
      WHERE status = 'open' 
        AND end_date < CURRENT_DATE
        AND is_deleted = false
    `);
    
    return result.rowCount || 0;
  } catch (error) {
    console.error('Failed to close expired events in database:', error);
    throw error;
  }
}

// ==================== イベントコメント管理 ====================

/**
 * イベントのコメントを取得
 */
export async function getEventComments(eventId: string): Promise<Comment[]> {
  try {
    const result = await pool.query(`
      SELECT
        c.id,
        c.event_id as "eventId",
        c.user_id as "userId",
        u.username,
        c.content,
        c.created_at as "createdAt"
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.event_id = $1 AND c.is_deleted = false
      ORDER BY c.created_at ASC
    `, [eventId]);
    
    return result.rows.map(row => ({
      id: row.id,
      eventId: row.eventId,
      userId: row.userId,
      username: row.username,
      content: row.content,
      createdAt: row.createdAt,
    })) as Comment[];
  } catch (error) {
    console.error('Failed to get event comments from database:', error);
    throw error;
  }
}

/**
 * イベントにコメントを追加
 */
export async function createEventComment(comment: Omit<Comment, 'id' | 'createdAt' | 'username'>): Promise<Comment> {
  try {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    
    // ユーザー情報を取得
    const user = await getUserById(comment.userId);
    if (!user) {
      throw new Error('User not found');
    }
    
    await pool.query(`
      INSERT INTO comments (id, event_id, user_id, content, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      id,
      comment.eventId,
      comment.userId,
      comment.content,
      now,
      now,
    ]);
    
    return {
      id,
      eventId: comment.eventId,
      userId: comment.userId,
      username: user.username,
      content: comment.content,
      createdAt: now,
    } as Comment;
  } catch (error) {
    console.error('Failed to create event comment in database:', error);
    throw error;
  }
}

/**
 * イベントのコメントを削除
 */
export async function deleteEventComment(commentId: string, userId: string): Promise<boolean> {
  try {
    const result = await pool.query(`
      UPDATE comments
      SET
        is_deleted = true,
        deleted_at = NOW(),
        deleted_by = $1
      WHERE id = $2 AND user_id = $1
    `, [userId, commentId]);
    
    return result.rowCount !== null && result.rowCount > 0;
  } catch (error) {
    console.error('Failed to delete event comment in database:', error);
    throw error;
  }
}

