-- グループチャットテーブルにlast_message_idとlast_message_atカラムを追加
-- 既存のデータベースに適用するためのマイグレーションスクリプト

ALTER TABLE group_chats 
ADD COLUMN IF NOT EXISTS last_message_id TEXT,
ADD COLUMN IF NOT EXISTS last_message_at TIMESTAMP WITH TIME ZONE;

