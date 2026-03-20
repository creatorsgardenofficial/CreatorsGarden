import { NextRequest, NextResponse } from 'next/server';
import { getUserByEmail, reactivateUser } from '@/lib/storage';
import { verifyPassword } from '@/lib/password';
import { validateEmail } from '@/lib/contentFilter';
import { generateCsrfToken } from '@/lib/csrf';
import { logSecurityEvent } from '@/lib/securityLog';
import { getClientIp } from '@/lib/utils';

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const userAgent = request.headers.get('user-agent') || 'unknown';
  
  try {
    const body = await request.json();
    const { email, password } = body;

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

    const user = await getUserByEmail(email);

    if (!user) {
      return NextResponse.json(
        { error: 'メールアドレスまたはパスワードが正しくありません' },
        { status: 401 }
      );
    }

    // 退会済みアカウントかチェック
    if (!user.deactivatedAt) {
      return NextResponse.json(
        { error: 'このアカウントは退会していません' },
        { status: 400 }
      );
    }

    // パスワードチェック
    const isValidPassword = await verifyPassword(password, user.password);
    if (!isValidPassword) {
      await logSecurityEvent('reactivate_failure', {
        userId: user.id,
        email: user.email,
        ip,
        userAgent,
        details: { reason: 'invalid_password' },
        severity: 'medium',
      });
      
      return NextResponse.json(
        { error: 'メールアドレスまたはパスワードが正しくありません' },
        { status: 401 }
      );
    }

    // 復旧処理
    const reactivatedUser = await reactivateUser(user.id);
    
    if (!reactivatedUser) {
      return NextResponse.json(
        { error: 'アカウントの復旧に失敗しました' },
        { status: 500 }
      );
    }

    // セキュリティログに記録
    await logSecurityEvent('account_reactivated', {
      userId: user.id,
      email: user.email,
      ip,
      userAgent,
      severity: 'medium',
    });

    const response = NextResponse.json({ user: reactivatedUser }, { status: 200 });
    
    // CookieにユーザーIDを保存
    response.cookies.set('userId', reactivatedUser.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7日間
    });

    // CSRFトークンを生成してCookieに保存
    const csrfToken = generateCsrfToken(reactivatedUser.id);
    response.cookies.set('csrfToken', csrfToken, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 30, // 30分
    });

    return response;
  } catch (error: any) {
    // 本番環境では詳細なエラー情報をログに出力しない
    if (process.env.NODE_ENV === 'development') {
      } else {
      }
    return NextResponse.json(
      { error: 'アカウントの復旧に失敗しました' },
      { status: 500 }
    );
  }
}

