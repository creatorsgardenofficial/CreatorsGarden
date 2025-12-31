-- フィードバックテーブルのuser_idをNULL許可に変更
-- 匿名フィードバック対応のため

ALTER TABLE feedback 
ALTER COLUMN user_id DROP NOT NULL;

-- 外部キー制約を削除して再作成（NULLを許可するため）
ALTER TABLE feedback 
DROP CONSTRAINT IF EXISTS feedback_user_id_fkey;

ALTER TABLE feedback 
ADD CONSTRAINT feedback_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES users(id) 
ON DELETE CASCADE;

