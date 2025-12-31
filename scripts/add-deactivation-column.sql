-- 退会機能用カラムを追加
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS deactivated_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS deactivation_reason TEXT;

-- インデックスを追加（退会済みユーザーの検索用）
CREATE INDEX IF NOT EXISTS idx_users_deactivated_at ON users(deactivated_at) WHERE deactivated_at IS NOT NULL;

