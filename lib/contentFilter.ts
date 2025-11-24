// 不適切な言葉のパターン（簡易版）
// 実際の運用では、より包括的なリストや外部サービスを使用することを推奨します
const inappropriatePatterns = [
  // 日本語の不適切な言葉（一部）
  /バカ|アホ|死ね|殺す|クソ|くそ|しね|下手/i,
  /おっぱい|チン|ちん|まん|オナ|オナニー|自慰|手淫|手コキ|フェラ|パイズリ|アナル|肛門|性器|ペニス|ワギナ|クリトリス/i,
  /レイプ|強姦|輪姦|痴漢|性的虐待|性暴力|性犯罪/i,
  
  // 英語の不適切な言葉
  /fuck|shit|damn|bitch|asshole|bastard|prick|cunt|whore|slut|nigger|nigga|retard|fag|faggot/i,
  /kill|die|death|suicide|murder|rape|pedo|pedophile|nazi|hitler/i,
  /sex|porn|pornography|xxx|nsfw|hentai|erotic|masturbat|orgasm|ejaculat/i,
  
  // URLやリンクの不適切なパターン
  /http[s]?:\/\/.*(porn|xxx|sex|adult|nsfw|hentai).*/i,
];

/**
 * テキストに不適切な言葉が含まれているかチェック
 * @param text チェックするテキスト
 * @returns 不適切な言葉が含まれている場合はtrue
 */
export function containsInappropriateContent(text: string): boolean {
  if (!text || text.trim().length === 0) {
    return false;
  }

  const normalizedText = text.trim();
  
  for (const pattern of inappropriatePatterns) {
    if (pattern.test(normalizedText)) {
      return true;
    }
  }

  return false;
}

/**
 * スパムパターンを検出
 * @param text チェックするテキスト
 * @returns スパムパターンが検出された場合はエラーメッセージ、そうでなければnull
 */
export function detectSpamPatterns(text: string): string | null {
  if (!text || text.trim().length === 0) {
    return null;
  }

  const trimmedText = text.trim();
  const textLength = trimmedText.length;

  // 1. 連続した同じ文字の検出（5文字以上）
  const consecutiveCharPattern = /(.)\1{4,}/;
  if (consecutiveCharPattern.test(trimmedText)) {
    return '連続した同じ文字が多すぎます。スパムとみなされました。';
  }

  // 2. 繰り返しパターンの検出（同じ文字列が3回以上繰り返される）
  // 2-10文字のパターンをチェック
  for (let patternLength = 2; patternLength <= Math.min(10, Math.floor(textLength / 3)); patternLength++) {
    for (let start = 0; start <= textLength - patternLength * 3; start++) {
      const pattern = trimmedText.substring(start, start + patternLength);
      const repeated = pattern.repeat(3);
      if (trimmedText.substring(start).startsWith(repeated)) {
        return '繰り返しパターンが検出されました。スパムとみなされました。';
      }
    }
  }

  // 3. 特殊文字の過度な使用（全体の30%以上が特殊文字）
  const specialCharCount = (trimmedText.match(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/g) || []).length;
  if (textLength > 10 && specialCharCount / textLength > 0.3) {
    return '特殊文字の使用が多すぎます。スパムとみなされました。';
  }

  // 4. URLの過度な含まれ（3つ以上）
  const urlPattern = /https?:\/\/[^\s]+/gi;
  const urlMatches = trimmedText.match(urlPattern);
  if (urlMatches && urlMatches.length >= 3) {
    return 'URLが多すぎます。スパムとみなされました。';
  }

  // 5. 数字のみの文字列（10文字以上）
  if (/^\d{10,}$/.test(trimmedText)) {
    return '数字のみの入力はスパムとみなされます。';
  }

  // 6. 空白文字の過度な使用（全体の50%以上が空白）
  const whitespaceCount = (trimmedText.match(/\s/g) || []).length;
  if (textLength > 10 && whitespaceCount / textLength > 0.5) {
    return '空白文字が多すぎます。スパムとみなされました。';
  }

  // 7. 絵文字や記号の過度な使用（全体の40%以上）
  const emojiPattern = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu;
  const emojiCount = (trimmedText.match(emojiPattern) || []).length;
  if (textLength > 10 && emojiCount / textLength > 0.4) {
    return '絵文字や記号が多すぎます。スパムとみなされました。';
  }

  // 8. 大文字のみの文字列（英語の場合、10文字以上）
  if (/^[A-Z\s]{10,}$/.test(trimmedText)) {
    return '大文字のみの入力はスパムとみなされます。';
  }

  // 9. 同じ単語の繰り返し（同じ単語が5回以上）
  const words = trimmedText.split(/\s+/).filter(w => w.length > 0);
  const wordCounts = new Map<string, number>();
  for (const word of words) {
    const normalizedWord = word.toLowerCase().replace(/[^\w\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g, '');
    if (normalizedWord.length > 0) {
      wordCounts.set(normalizedWord, (wordCounts.get(normalizedWord) || 0) + 1);
    }
  }
  for (const count of wordCounts.values()) {
    if (count >= 5) {
      return '同じ単語の繰り返しが多すぎます。スパムとみなされました。';
    }
  }

  return null;
}

/**
 * 不適切な言葉をフィルタリングしてエラーメッセージを返す
 * @param text チェックするテキスト
 * @returns 不適切な言葉が含まれている場合はエラーメッセージ、そうでなければnull
 */
export function validateContent(text: string): string | null {
  if (containsInappropriateContent(text)) {
    return '不適切な言葉が含まれています。誹謗中傷や卑猥な言葉は使用できません。';
  }
  
  // スパムパターンのチェック
  const spamError = detectSpamPatterns(text);
  if (spamError) {
    return spamError;
  }
  
  return null;
}

/**
 * 複数のテキストフィールドを一括でチェック
 * @param fields チェックするフィールドのオブジェクト
 * @returns エラーメッセージのオブジェクト（フィールド名をキーとする）
 */
export function validateMultipleFields(fields: Record<string, string>): Record<string, string> {
  const errors: Record<string, string> = {};

  for (const [fieldName, value] of Object.entries(fields)) {
    const error = validateContent(value);
    if (error) {
      errors[fieldName] = error;
    }
  }

  return errors;
}

/**
 * パスワードのバリデーション
 * 小文字アルファベットと数字を組み合わせて8文字以上
 * @param password チェックするパスワード
 * @returns エラーメッセージ（問題がなければnull）
 */
export function validatePassword(password: string): string | null {
  if (!password) {
    return 'パスワードを入力してください';
  }

  // 小文字が含まれているかチェック
  const hasLowerCase = /[a-z]/.test(password);
  // 数字が含まれているかチェック
  const hasNumber = /[0-9]/.test(password);

  if (password.length < 8 || !hasLowerCase || !hasNumber) {
    return 'パスワードは8文字以上、小文字アルファベットと数字を組み合わせて8文字以上';
  }

  return null;
}

/**
 * メールアドレスのバリデーション
 * @param email チェックするメールアドレス
 * @returns エラーメッセージ（問題がなければnull）
 */
export function validateEmail(email: string): string | null {
  if (!email) {
    return 'メールアドレスを入力してください';
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return '有効なメールアドレスを入力してください';
  }

  return null;
}

/**
 * URLのバリデーション
 * @param url チェックするURL
 * @returns エラーメッセージ（問題がなければnull）
 */
export function validateUrl(url: string): string | null {
  if (!url || url.trim().length === 0) {
    return null; // 空の場合は問題なし（オプショナルフィールド）
  }

  try {
    const urlObj = new URL(url);
    
    // 許可されたプロトコルのみ（http, https）
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return '無効なURLです。httpまたはhttpsのみ使用できます。';
    }

    // SSRF対策：ローカルホストやプライベートIPをブロック
    const hostname = urlObj.hostname.toLowerCase();
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('10.') ||
      hostname.startsWith('172.16.') ||
      hostname.startsWith('172.17.') ||
      hostname.startsWith('172.18.') ||
      hostname.startsWith('172.19.') ||
      hostname.startsWith('172.20.') ||
      hostname.startsWith('172.21.') ||
      hostname.startsWith('172.22.') ||
      hostname.startsWith('172.23.') ||
      hostname.startsWith('172.24.') ||
      hostname.startsWith('172.25.') ||
      hostname.startsWith('172.26.') ||
      hostname.startsWith('172.27.') ||
      hostname.startsWith('172.28.') ||
      hostname.startsWith('172.29.') ||
      hostname.startsWith('172.30.') ||
      hostname.startsWith('172.31.')
    ) {
      return '無効なURLです。';
    }

    return null;
  } catch {
    return '無効なURL形式です。';
  }
}

