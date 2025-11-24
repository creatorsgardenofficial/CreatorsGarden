import * as bcrypt from 'bcryptjs';

/**
 * パスワードをハッシュ化
 * @param password 平文のパスワード
 * @returns ハッシュ化されたパスワード
 */
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
}

/**
 * パスワードを検証
 * @param password 平文のパスワード
 * @param hashedPassword ハッシュ化されたパスワード
 * @returns 一致する場合はtrue
 */
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  // 既存の平文パスワードとの互換性チェック（移行期間中）
  // ハッシュ化されていないパスワード（平文）の場合は、直接比較
  if (!hashedPassword.startsWith('$2a$') && !hashedPassword.startsWith('$2b$') && !hashedPassword.startsWith('$2y$')) {
    // bcryptハッシュではない場合、平文と比較（後方互換性）
    return password === hashedPassword;
  }
  
  // bcryptでハッシュ化されている場合は検証
  return await bcrypt.compare(password, hashedPassword);
}

/**
 * パスワードがハッシュ化されているかチェック
 * @param password パスワード（ハッシュ化されている可能性がある）
 * @returns ハッシュ化されている場合はtrue
 */
export function isPasswordHashed(password: string): boolean {
  return password.startsWith('$2a$') || password.startsWith('$2b$') || password.startsWith('$2y$');
}

