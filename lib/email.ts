import nodemailer from 'nodemailer';

/**
 * メール送信用のトランスポーターを作成
 * 本番環境では、環境変数が設定されていなくてもデフォルト設定で試行
 */
function createTransporter() {
  const isProduction = process.env.NODE_ENV === 'production';
  
  // 環境変数から取得、なければデフォルト値を使用
  const smtpHost = process.env.SMTP_HOST || (isProduction ? 'smtp.gmail.com' : null);
  const smtpPort = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpSecure = process.env.SMTP_SECURE === 'true';

  // 本番環境では、設定が不完全でも警告を出して試行
  if (!smtpHost || !smtpUser || !smtpPass) {
    if (isProduction) {
      console.error('⚠️ 警告: SMTP設定が不完全です。メール送信が失敗する可能性があります。');
      console.error('環境変数 SMTP_HOST, SMTP_USER, SMTP_PASS を設定してください。');
      // 本番環境では設定がなくても試行（エラーは後で処理）
      if (!smtpHost || !smtpUser || !smtpPass) {
        return null;
      }
    } else {
      console.warn('SMTP設定が不完全です。環境変数を確認してください。');
      return null;
    }
  }

  return nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpSecure, // true for 465, false for other ports
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });
}

/**
 * パスワードリセットメールを送信
 */
export async function sendPasswordResetEmail(
  to: string,
  resetLink: string
): Promise<boolean> {
  try {
    const transporter = createTransporter();
    if (!transporter) {
      console.error('メール送信設定が不完全です');
      return false;
    }

    const fromEmail = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER;
    const fromName = process.env.SMTP_FROM_NAME || 'Creators Garden';

    const mailOptions = {
      from: `"${fromName}" <${fromEmail}>`,
      to: to,
      subject: 'パスワードリセットリクエスト',
      text: `パスワードリセットリクエスト

以下のリンクをクリックしてパスワードをリセットしてください。
このリンクは24時間有効です。

${resetLink}

このリクエストを行っていない場合は、このメールを無視してください。

---
Creators Garden`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
    <h1 style="color: #4f46e5; margin-top: 0;">パスワードリセットリクエスト</h1>
  </div>
  
  <p>以下のリンクをクリックしてパスワードをリセットしてください。</p>
  <p style="color: #666; font-size: 14px;">このリンクは24時間有効です。</p>
  
  <div style="margin: 30px 0;">
    <a href="${resetLink}" style="display: inline-block; background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
      パスワードをリセット
    </a>
  </div>
  
  <p style="color: #666; font-size: 12px; margin-top: 30px;">
    ボタンがクリックできない場合は、以下のリンクをコピーしてブラウザに貼り付けてください：<br>
    <a href="${resetLink}" style="color: #4f46e5; word-break: break-all;">${resetLink}</a>
  </p>
  
  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
  
  <p style="color: #999; font-size: 12px;">
    このリクエストを行っていない場合は、このメールを無視してください。<br>
    パスワードは変更されません。
  </p>
  
  <p style="color: #999; font-size: 12px; margin-top: 20px;">
    ---<br>
    Creators Garden
  </p>
</body>
</html>
      `.trim(),
    };

    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    // メール送信エラーは静かに無視（呼び出し元で処理）
    return false;
  }
}

/**
 * メール送信設定を検証
 */
export function isEmailConfigured(): boolean {
  const smtpHost = process.env.SMTP_HOST;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  
  return !!(smtpHost && smtpUser && smtpPass);
}

