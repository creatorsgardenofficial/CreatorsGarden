-- ============================================
-- メンテナンス機能用テーブル作成
-- ============================================

-- システム設定テーブル（メンテナンスモード用）
CREATE TABLE IF NOT EXISTS system_settings (
  id TEXT PRIMARY KEY DEFAULT 'maintenance',
  is_maintenance BOOLEAN DEFAULT false,
  maintenance_message TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 初期データを挿入（メンテナンスモードはOFF）
INSERT INTO system_settings (id, is_maintenance, maintenance_message, updated_at)
VALUES ('maintenance', false, '現在メンテナンス中です。ご迷惑をおかけいたします。', NOW())
ON CONFLICT (id) DO NOTHING;

-- テーブル作成確認
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'system_settings'
ORDER BY ordinal_position;

