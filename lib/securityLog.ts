import { promises as fs } from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const SECURITY_LOG_FILE = path.join(DATA_DIR, 'security-log.json');

// セキュリティログの型定義
export interface SecurityLogEntry {
  id: string;
  timestamp: string;
  type: 'login_attempt' | 'login_success' | 'login_failure' | 'rate_limit_exceeded' | 'csrf_failure' | 'admin_action' | 'account_suspended' | 'account_activated' | 'password_change' | 'unauthorized_access' | 'account_locked';
  userId?: string;
  email?: string;
  ip?: string;
  userAgent?: string;
  details?: Record<string, any>;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

// データディレクトリの初期化
async function ensureDataDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch (error) {
    console.error('Failed to create data directory:', error);
  }
}

// ログファイルの読み込み
async function readLogs(): Promise<SecurityLogEntry[]> {
  await ensureDataDir();
  try {
    const data = await fs.readFile(SECURITY_LOG_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

// ログファイルの保存
async function saveLogs(logs: SecurityLogEntry[]): Promise<void> {
  await ensureDataDir();
  // 最新1000件のみ保持（メモリ効率のため）
  const recentLogs = logs.slice(-1000);
  await fs.writeFile(SECURITY_LOG_FILE, JSON.stringify(recentLogs, null, 2), 'utf-8');
}

/**
 * セキュリティログを記録
 */
export async function logSecurityEvent(
  type: SecurityLogEntry['type'],
  options: {
    userId?: string;
    email?: string;
    ip?: string;
    userAgent?: string;
    details?: Record<string, any>;
    severity?: SecurityLogEntry['severity'];
  } = {}
): Promise<void> {
  try {
    const logs = await readLogs();
    const entry: SecurityLogEntry = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      type,
      userId: options.userId,
      email: options.email,
      ip: options.ip,
      userAgent: options.userAgent,
      details: options.details,
      severity: options.severity || getDefaultSeverity(type),
    };
    
    logs.push(entry);
    await saveLogs(logs);
  } catch (error) {
    // ログ記録の失敗はアプリケーションの動作を妨げない
    console.error('Failed to log security event:', error);
  }
}

/**
 * タイプに応じたデフォルトの重要度を取得
 */
function getDefaultSeverity(type: SecurityLogEntry['type']): SecurityLogEntry['severity'] {
  switch (type) {
    case 'login_success':
      return 'low';
    case 'login_attempt':
      return 'low';
    case 'login_failure':
      return 'medium';
    case 'rate_limit_exceeded':
      return 'medium';
    case 'csrf_failure':
      return 'high';
    case 'admin_action':
      return 'medium';
    case 'account_suspended':
      return 'high';
    case 'account_activated':
      return 'medium';
    case 'password_change':
      return 'medium';
    case 'unauthorized_access':
      return 'high';
    default:
      return 'medium';
  }
}

/**
 * セキュリティログを取得（管理者用）
 */
export async function getSecurityLogs(
  options: {
    limit?: number;
    type?: SecurityLogEntry['type'];
    severity?: SecurityLogEntry['severity'];
    userId?: string;
    startDate?: string;
    endDate?: string;
  } = {}
): Promise<SecurityLogEntry[]> {
  try {
    let logs = await readLogs();
    
    // フィルタリング
    if (options.type) {
      logs = logs.filter(log => log.type === options.type);
    }
    if (options.severity) {
      logs = logs.filter(log => log.severity === options.severity);
    }
    if (options.userId) {
      logs = logs.filter(log => log.userId === options.userId);
    }
    if (options.startDate) {
      logs = logs.filter(log => log.timestamp >= options.startDate!);
    }
    if (options.endDate) {
      logs = logs.filter(log => log.timestamp <= options.endDate!);
    }
    
    // 新しい順にソート
    logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    // 制限
    if (options.limit) {
      logs = logs.slice(0, options.limit);
    }
    
    return logs;
  } catch (error) {
    console.error('Failed to get security logs:', error);
    return [];
  }
}

/**
 * 異常なアクセスパターンを検知
 */
export async function detectAnomalies(): Promise<{
  suspiciousLogins: number;
  rateLimitViolations: number;
  csrfFailures: number;
  unauthorizedAccess: number;
}> {
  try {
    const logs = await readLogs();
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const recentLogs = logs.filter(log => log.timestamp >= last24Hours);
    
    // 同一IPからの連続したログイン失敗
    const loginFailuresByIp = new Map<string, number>();
    recentLogs
      .filter(log => log.type === 'login_failure' && log.ip)
      .forEach(log => {
        const count = loginFailuresByIp.get(log.ip!) || 0;
        loginFailuresByIp.set(log.ip!, count + 1);
      });
    const suspiciousLogins = Array.from(loginFailuresByIp.values())
      .filter(count => count >= 5).length;
    
    // レート制限違反
    const rateLimitViolations = recentLogs
      .filter(log => log.type === 'rate_limit_exceeded').length;
    
    // CSRF失敗
    const csrfFailures = recentLogs
      .filter(log => log.type === 'csrf_failure').length;
    
    // 不正アクセス試行
    const unauthorizedAccess = recentLogs
      .filter(log => log.type === 'unauthorized_access').length;
    
    return {
      suspiciousLogins,
      rateLimitViolations,
      csrfFailures,
      unauthorizedAccess,
    };
  } catch (error) {
    console.error('Failed to detect anomalies:', error);
    return {
      suspiciousLogins: 0,
      rateLimitViolations: 0,
      csrfFailures: 0,
      unauthorizedAccess: 0,
    };
  }
}

