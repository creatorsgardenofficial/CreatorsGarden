-- メンテナンスメッセージを更新するSQLスクリプト
-- 「しばらくお待ちください。」を「ご迷惑をおかけいたします。」に変更

UPDATE system_settings
SET maintenance_message = '現在メンテナンス中です。ご迷惑をおかけいたします。',
    updated_at = NOW()
WHERE id = 'maintenance'
  AND maintenance_message = '現在メンテナンス中です。しばらくお待ちください。';

-- 更新結果を確認
SELECT 
  id,
  is_maintenance,
  maintenance_message,
  updated_at
FROM system_settings
WHERE id = 'maintenance';

