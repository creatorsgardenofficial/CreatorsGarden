-- ============================================
-- 本番環境に不足しているカラムを追加するSQL
-- 開発環境と同じテーブル・カラム構造にするためのマイグレーション
-- ============================================

-- グループチャットテーブルにlast_message_idとlast_message_atカラムを追加
ALTER TABLE group_chats 
ADD COLUMN IF NOT EXISTS last_message_id TEXT,
ADD COLUMN IF NOT EXISTS last_message_at TIMESTAMP WITH TIME ZONE;

-- 投稿テーブルにurlsカラムを追加（複数URL対応）
ALTER TABLE posts
ADD COLUMN IF NOT EXISTS urls JSONB;

-- インデックスが存在しない場合は追加（念のため）
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_public_id ON users(public_id);
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_type ON posts(type);
CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_id ON messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_user_id ON bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_post_id ON bookmarks(post_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_security_logs_user_id ON security_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_security_logs_type ON security_logs(type);
CREATE INDEX IF NOT EXISTS idx_security_logs_created_at ON security_logs(created_at);





