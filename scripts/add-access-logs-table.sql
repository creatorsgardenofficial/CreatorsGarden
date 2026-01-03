-- アクセスログテーブルを作成
CREATE TABLE IF NOT EXISTS access_logs (
  id TEXT PRIMARY KEY,
  path TEXT NOT NULL,
  method TEXT NOT NULL,
  user_id TEXT,
  ip_address TEXT,
  user_agent TEXT,
  referer TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- インデックスを作成（パフォーマンス向上のため）
CREATE INDEX IF NOT EXISTS idx_access_logs_created_at ON access_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_access_logs_path ON access_logs(path);
CREATE INDEX IF NOT EXISTS idx_access_logs_user_id ON access_logs(user_id);

-- コメントを追加
COMMENT ON TABLE access_logs IS 'サイトアクセスログを記録するテーブル';
COMMENT ON COLUMN access_logs.path IS 'アクセスしたパス';
COMMENT ON COLUMN access_logs.method IS 'HTTPメソッド（GET, POST等）';
COMMENT ON COLUMN access_logs.user_id IS 'ログイン中のユーザーID（未ログインの場合はNULL）';
COMMENT ON COLUMN access_logs.ip_address IS 'アクセス元のIPアドレス';
COMMENT ON COLUMN access_logs.user_agent IS 'ユーザーエージェント（ブラウザ情報）';
COMMENT ON COLUMN access_logs.referer IS 'リファラー（遷移元URL）';

