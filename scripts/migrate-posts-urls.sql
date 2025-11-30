-- 投稿テーブルにurlsカラムを追加
ALTER TABLE posts
ADD COLUMN IF NOT EXISTS urls JSONB;

