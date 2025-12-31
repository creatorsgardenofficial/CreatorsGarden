import { getSystemSettings } from './storage';
import { getUserById } from './storage';
import { isAdmin } from './admin';

/**
 * メンテナンスモード中かどうかをチェック
 * @param userId ユーザーID（管理者の場合はメンテナンス中でもアクセス可能）
 * @returns メンテナンス中の場合true
 */
export async function isMaintenanceMode(userId?: string): Promise<boolean> {
  try {
    const settings = await getSystemSettings();
    
    if (!settings.isMaintenance) {
      return false;
    }

    // 管理者の場合はメンテナンス中でもアクセス可能
    if (userId) {
      const user = await getUserById(userId);
      if (user && isAdmin(user.email)) {
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error('Maintenance check error:', error);
    // エラー時はメンテナンスモードOFFとして扱う
    return false;
  }
}

