import { NextRequest, NextResponse } from 'next/server';
import { getUserByEmail, createPasswordResetToken, deleteExpiredPasswordResetTokens } from '@/lib/storage';
import { validateEmail } from '@/lib/contentFilter';
import { sendPasswordResetEmail, isEmailConfigured } from '@/lib/email';
import crypto from 'crypto';

/**
 * パスワードリセット申請
 * メールアドレスを入力して、パスワードリセットリンクを送信
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'メールアドレスを入力してください' },
        { status: 400 }
      );
    }

    // メールアドレスのバリデーション
    const emailError = validateEmail(email);
    if (emailError) {
      return NextResponse.json(
        { error: emailError },
        { status: 400 }
      );
    }

    // ユーザーを検索
    const user = await getUserByEmail(email);
    
    // セキュリティのため、ユーザーが存在しない場合でも成功メッセージを返す
    // （メールアドレスの存在を推測されないようにする）
    if (!user) {
      // 本番環境では機密情報をログに出力しない
      if (process.env.NODE_ENV === 'development') {
        console.log('Password reset requested for non-existent email:', email);
      }
      return NextResponse.json({
        success: true,
        message: 'メールアドレスが登録されている場合、パスワードリセットリンクを送信しました。',
      }, { status: 200 });
    }

    // 利用停止チェック
    if (user.isActive === false) {
      return NextResponse.json(
        { error: 'このアカウントは利用停止されています' },
        { status: 403 }
      );
    }

    // 期限切れのトークンを削除
    await deleteExpiredPasswordResetTokens();

    // ランダムなトークンを生成
    const token = crypto.randomBytes(32).toString('hex');
    
    // トークンを保存（24時間有効）
    const resetToken = await createPasswordResetToken(user.id, user.email, token, 24);

    // パスワードリセットリンクを生成
    // Vercel本番環境ではVERCEL_URLが自動的に設定される
    // それがない場合はNEXT_PUBLIC_BASE_URL、それもない場合はlocalhost
    let baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
    if (!baseUrl) {
      // Vercel環境ではVERCEL_URLを使用
      if (process.env.VERCEL_URL) {
        baseUrl = `https://${process.env.VERCEL_URL}`;
      } else if (process.env.VERCEL) {
        // Vercel環境だがVERCEL_URLがない場合（通常はないが念のため）
        baseUrl = 'https://creatorsgarden.vercel.app';
      } else {
        // ローカル開発環境
        baseUrl = 'http://localhost:3000';
      }
    }
    const resetLink = `${baseUrl}/reset-password?token=${token}`;

    // メール送信
    const isProduction = process.env.NODE_ENV === 'production';
    const isVercelProduction = process.env.VERCEL === '1' || process.env.VERCEL_ENV === 'production';
    
    if (isEmailConfigured() || isProduction) {
      // SMTP設定がある場合、または本番環境の場合: 実際にメールを送信を試行
      const emailSent = await sendPasswordResetEmail(user.email, resetLink);
      if (!emailSent) {
        console.error('Failed to send password reset email to:', user.email);
        
        // 本番環境でメール送信に失敗した場合
        if (isProduction) {
          // Vercel本番環境ではファイルシステムに書き込めない
          if (isVercelProduction) {
            console.error('⚠️ 本番環境ではSMTP設定が必要です。環境変数を確認してください。');
            console.error('⚠️ Vercel本番環境ではファイルシステムへの書き込みはできません。');
          } else {
            // 非Vercel本番環境の場合のみファイルに保存を試行
            try {
              const fs = require('fs').promises;
              const path = require('path');
              const emailsDir = path.join(process.cwd(), 'data', 'emails');
              await fs.mkdir(emailsDir, { recursive: true });
              
              const emailContent = `
パスワードリセットリクエスト

以下のリンクをクリックしてパスワードをリセットしてください。
このリンクは24時間有効です。

${resetLink}

このリクエストを行っていない場合は、このメールを無視してください。

---
Creators Garden
              `.trim();
              
              const emailFile = path.join(emailsDir, `password-reset-${Date.now()}.txt`);
              await fs.writeFile(emailFile, emailContent, 'utf-8');
              console.error('メール送信に失敗しました。メール内容をファイルに保存しました:', emailFile);
            } catch (fileError) {
              console.error('⚠️ ファイルへの保存にも失敗しました:', fileError);
            }
          }
        }
        // メール送信に失敗しても、セキュリティのため成功メッセージを返す
      }
    } else {
      // 開発環境でSMTP設定がない場合: ファイルに保存（Vercel本番環境ではスキップ）
      if (!isVercelProduction) {
        try {
          const emailContent = `
パスワードリセットリクエスト

以下のリンクをクリックしてパスワードをリセットしてください。
このリンクは24時間有効です。

${resetLink}

このリクエストを行っていない場合は、このメールを無視してください。

---
Creators Garden
          `.trim();

          const fs = require('fs').promises;
          const path = require('path');
          const emailsDir = path.join(process.cwd(), 'data', 'emails');
          await fs.mkdir(emailsDir, { recursive: true });
          
          const emailFile = path.join(emailsDir, `password-reset-${Date.now()}.txt`);
          await fs.writeFile(emailFile, emailContent, 'utf-8');
          
          // 開発環境のみログ出力
          if (process.env.NODE_ENV === 'development') {
            console.log('Password reset email saved to:', emailFile);
            console.log('Reset link:', resetLink);
            console.log('ℹ️  開発環境: SMTP設定がないため、ファイルに保存しました。');
            console.log('   本番環境では環境変数を設定すると実際のメールアドレスに送信されます。');
          }
        } catch (fileError) {
          console.error('⚠️ ファイルへの保存に失敗しました:', fileError);
          console.log('Reset link (console only):', resetLink);
        }
      } else {
        // Vercel本番環境ではファイルシステムに書き込めないため、ログにのみ出力
        console.log('Reset link (console only):', resetLink);
        console.log('⚠️ Vercel本番環境ではファイルシステムへの書き込みはできません。');
      }
    }

    // 本番環境では機密情報をログに出力しない
    if (process.env.NODE_ENV === 'development') {
      console.log('Password reset token created:', {
        userId: user.id,
        email: user.email,
        tokenId: resetToken.id,
        expiresAt: resetToken.expiresAt,
      });
    }

    return NextResponse.json({
      success: true,
      message: 'メールアドレスが登録されている場合、パスワードリセットリンクを送信しました。',
      // SMTP設定がない場合のみリンクを返す（デバッグ用）
      ...(!isEmailConfigured() && {
        resetLink,
      }),
    }, { status: 200 });

  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { error: 'パスワードリセット申請に失敗しました' },
      { status: 500 }
    );
  }
}

