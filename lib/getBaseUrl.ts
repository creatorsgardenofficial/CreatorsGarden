/**
 * ベースURLを取得する関数
 * Vercel本番環境では適切なURLを返す
 */
export function getBaseUrl(): string {
  // NEXT_PUBLIC_BASE_URLが設定されている場合はそれを使用
  if (process.env.NEXT_PUBLIC_BASE_URL) {
    return process.env.NEXT_PUBLIC_BASE_URL;
  }

  // Vercel環境ではVERCEL_URLを使用
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  // Vercel環境だがVERCEL_URLがない場合（通常はないが念のため）
  if (process.env.VERCEL) {
    return 'https://creators-garden-app.vercel.app';
  }

  // ローカル開発環境
  return 'http://localhost:3000';
}

