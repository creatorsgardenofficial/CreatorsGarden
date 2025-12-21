-- postsテーブルにbumped_atカラムを追加
ALTER TABLE posts
ADD COLUMN IF NOT EXISTS bumped_at TIMESTAMP WITH TIME ZONE;

