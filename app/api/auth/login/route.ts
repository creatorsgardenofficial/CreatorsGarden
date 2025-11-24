import { NextRequest, NextResponse } from 'next/server';
import { getUsers, updateUser } from '@/lib/storage';
import { validateEmail } from '@/lib/contentFilter';
import { verifyPassword, hashPassword, isPasswordHashed } from '@/lib/password';
import { generateCsrfToken } from '@/lib/csrf';
import { logSecurityEvent } from '@/lib/securityLog';
import { getClientIp } from '@/lib/utils';
import { User } from '@/types';

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const userAgent = request.headers.get('user-agent') || 'unknown';
  
  try {
    const body = await request.json();
    const { email, password } = body;
    
    // ログイン試行を記録
    await logSecurityEvent('login_attempt', {
      email,
      ip,
      userAgent,
      severity: 'low',
    });

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

    if (!password) {
      return NextResponse.json(
        { error: 'パスワードを入力してください' },
        { status: 400 }
      );
    }

    const users = await getUsers();
    const user = users.find(u => u.email === email);

    if (!user) {
      // ログイン失敗を記録
      await logSecurityEvent('login_failure', {
        email,
        ip,
        userAgent,
        details: { reason: 'user_not_found' },
        severity: 'medium',
      });
      
      return NextResponse.json(
        { error: 'メールアドレスまたはパスワードが正しくありません' },
        { status: 401 }
      );
    }

    // 利用停止チェック
    if (user.isActive === false) {
      return NextResponse.json(
        { error: 'このアカウントは利用停止されています' },
        { status: 403 }
      );
    }

    // アカウントロックチェック
    const now = Date.now();
    if (user.accountLockedUntil) {
      const lockedUntil = new Date(user.accountLockedUntil).getTime();
      if (now < lockedUntil) {
        const remainingMinutes = Math.ceil((lockedUntil - now) / (60 * 1000));
        await logSecurityEvent('login_failure', {
          userId: user.id,
          email: user.email,
          ip,
          userAgent,
          details: { reason: 'account_locked', remainingMinutes },
          severity: 'high',
        });
        
        return NextResponse.json(
          { error: `アカウントがロックされています。あと${remainingMinutes}分後に再試行できます。` },
          { status: 423 } // 423 Locked
        );
      } else {
        // ロック期限が過ぎている場合は解除
        await updateUser(user.id, {
          accountLockedUntil: undefined,
          failedLoginAttempts: 0,
        });
      }
    }

    // パスワードチェック（ハッシュ化対応）
    const isValidPassword = await verifyPassword(password, user.password);
    if (!isValidPassword) {
      // ログイン失敗回数を増やす
      const failedAttempts = (user.failedLoginAttempts || 0) + 1;
      const MAX_FAILED_ATTEMPTS = 5;
      const LOCK_DURATION_MINUTES = 30;
      
      let updateData: Partial<User> = {
        failedLoginAttempts: failedAttempts,
      };
      
      // 5回失敗でアカウントをロック
      if (failedAttempts >= MAX_FAILED_ATTEMPTS) {
        const lockedUntil = new Date(now + LOCK_DURATION_MINUTES * 60 * 1000).toISOString();
        updateData.accountLockedUntil = lockedUntil;
        
        await logSecurityEvent('account_locked', {
          userId: user.id,
          email: user.email,
          ip,
          userAgent,
          details: { reason: 'too_many_failed_attempts', failedAttempts, lockedUntil },
          severity: 'high',
        });
      }
      
      await updateUser(user.id, updateData);
      
      // ログイン失敗を記録
      await logSecurityEvent('login_failure', {
        userId: user.id,
        email: user.email,
        ip,
        userAgent,
        details: { reason: 'invalid_password', failedAttempts, remainingAttempts: MAX_FAILED_ATTEMPTS - failedAttempts },
        severity: failedAttempts >= MAX_FAILED_ATTEMPTS ? 'high' : 'medium',
      });
      
      if (failedAttempts >= MAX_FAILED_ATTEMPTS) {
        return NextResponse.json(
          { error: `ログインに${MAX_FAILED_ATTEMPTS}回失敗したため、アカウントが${LOCK_DURATION_MINUTES}分間ロックされました。` },
          { status: 423 } // 423 Locked
        );
      }
      
      return NextResponse.json(
        { error: `メールアドレスまたはパスワードが正しくありません。あと${MAX_FAILED_ATTEMPTS - failedAttempts}回失敗するとアカウントがロックされます。` },
        { status: 401 }
      );
    }

    // 既存の平文パスワードをハッシュ化（移行処理）
    if (!isPasswordHashed(user.password)) {
      const hashedPassword = await hashPassword(password);
      await updateUser(user.id, { password: hashedPassword });
    }

    // ログイン成功時は失敗回数とロック状態をリセット
    if (user.failedLoginAttempts || user.accountLockedUntil) {
      await updateUser(user.id, {
        failedLoginAttempts: 0,
        accountLockedUntil: undefined,
      });
    }

    const response = NextResponse.json({ user }, { status: 200 });
    
    // CookieにユーザーIDを保存
    response.cookies.set('userId', user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7日間
    });

    // CSRFトークンを生成してCookieに保存
    const csrfToken = generateCsrfToken(user.id);
    response.cookies.set('csrfToken', csrfToken, {
      httpOnly: false, // クライアント側で読み取り可能にする必要がある
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict', // CSRF対策のためstrictに設定
      maxAge: 60 * 30, // 30分
    });

    // ログイン成功を記録
    await logSecurityEvent('login_success', {
      userId: user.id,
      email: user.email,
      ip,
      userAgent,
      severity: 'low',
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'ログインに失敗しました' },
      { status: 500 }
    );
  }
}

