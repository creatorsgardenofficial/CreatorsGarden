/**
 * 管理者判定ユーティリティ
 */

/**
 * 管理者メールアドレスかどうかを判定
 * @param userEmail ユーザーのメールアドレス
 * @returns 管理者の場合true
 */
export function isAdmin(userEmail: string | undefined): boolean {
  if (!userEmail) return false;
  
  // 環境変数から管理者メールアドレスを取得
  const adminEmails = process.env.ADMIN_EMAILS?.split(',').map(e => e.trim()) || [];
  
  // デフォルトの管理者メールアドレス
  const defaultAdminEmails = ['creators.garden.official@gmail.com'];
  
  const allAdminEmails = [...adminEmails, ...defaultAdminEmails];
  
  return allAdminEmails.includes(userEmail);
}

