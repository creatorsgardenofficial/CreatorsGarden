-- イベント投稿機能用テーブル追加
-- 実行日: 2026-01-04

-- イベントテーブル
CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT DEFAULT 'open',
  likes TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  bumped_at TIMESTAMP WITH TIME ZONE,
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMP WITH TIME ZONE,
  deleted_by TEXT,
  deletion_reason TEXT
);

-- イベントURLテーブル（最大3つまで）
CREATE TABLE IF NOT EXISTS event_urls (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  description TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(event_id, display_order)
);

-- イベント挙げ履歴テーブル（24時間クールタイム管理用）
CREATE TABLE IF NOT EXISTS event_bumps (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bumped_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

-- コメントテーブルにevent_idカラムを追加（既存のコメントテーブルを拡張）
-- まずpost_idをNULL許可にする
ALTER TABLE comments 
ALTER COLUMN post_id DROP NOT NULL;

ALTER TABLE comments 
ADD COLUMN IF NOT EXISTS event_id TEXT REFERENCES events(id) ON DELETE CASCADE;

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_events_user_id ON events(user_id);
CREATE INDEX IF NOT EXISTS idx_events_start_date ON events(start_date);
CREATE INDEX IF NOT EXISTS idx_events_end_date ON events(end_date);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_bumped_at ON events(bumped_at);
CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at);
CREATE INDEX IF NOT EXISTS idx_event_urls_event_id ON event_urls(event_id);
CREATE INDEX IF NOT EXISTS idx_event_bumps_event_id ON event_bumps(event_id);
CREATE INDEX IF NOT EXISTS idx_event_bumps_user_id ON event_bumps(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_event_id ON comments(event_id);

-- コメントテーブルの制約追加（post_idとevent_idのどちらか一方は必須）
-- 制約が存在しない場合のみ追加
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'check_comment_reference' 
    AND conrelid = 'comments'::regclass
  ) THEN
    ALTER TABLE comments 
    ADD CONSTRAINT check_comment_reference 
    CHECK ((post_id IS NOT NULL AND event_id IS NULL) OR (post_id IS NULL AND event_id IS NOT NULL));
  END IF;
END $$;

-- コメント
COMMENT ON TABLE events IS 'イベント投稿情報を格納するテーブル';
COMMENT ON TABLE event_urls IS 'イベントに関連するURLを格納するテーブル（最大3つまで）';
COMMENT ON TABLE event_bumps IS 'イベントの挙げ履歴を管理するテーブル（24時間クールタイム用）';
COMMENT ON COLUMN events.status IS 'イベントのステータス（open: 開催中, close: 終了）';
COMMENT ON COLUMN events.bumped_at IS '最後に挙げた時刻（投稿一覧の上位表示用）';
COMMENT ON COLUMN event_urls.display_order IS 'URLの表示順序（0, 1, 2）';

