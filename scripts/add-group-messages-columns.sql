-- ============================================
-- group_messagesテーブルに不足しているカラムを追加
-- 本番環境（6カラム）→ ローカル環境（8カラム）に合わせる
-- ============================================

-- sender_usernameカラムを追加（user_idの後、contentの前）
-- 注意: 既存のデータがある場合、usersテーブルからusernameを取得して更新する必要があります
ALTER TABLE group_messages
ADD COLUMN IF NOT EXISTS sender_username TEXT;

-- 既存のデータがある場合、usersテーブルからusernameを取得して更新
-- 実行前に既存データを確認してください
UPDATE group_messages gm
SET sender_username = u.username
FROM users u
WHERE gm.user_id = u.id
  AND gm.sender_username IS NULL;

-- sender_usernameにNOT NULL制約を追加（既存データを更新した後）
-- 注意: 上記のUPDATEが成功したことを確認してから実行してください
-- ALTER TABLE group_messages
-- ALTER COLUMN sender_username SET NOT NULL;

-- read_byカラムを追加（contentの後、created_atの前）
ALTER TABLE group_messages
ADD COLUMN IF NOT EXISTS read_by TEXT[] DEFAULT '{}';




