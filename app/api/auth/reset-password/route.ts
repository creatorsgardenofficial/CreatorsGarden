import { NextRequest, NextResponse } from 'next/server';
import { getPasswordResetTokenByToken, markPasswordResetTokenAsUsed, getUserById, updateUser } from '@/lib/storage';
import { hashPassword } from '@/lib/password';
import { validateEmail } from '@/lib/contentFilter';

/**
 * パスワードリセットトークンの検証
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { error: 'トークンが指定されていません' },
        { status: 400 }
      );
    }

    // トークンを検証
    const resetToken = await getPasswordResetTokenByToken(token);

    if (!resetToken) {
      return NextResponse.json(
        { error: '無効または期限切れのトークンです' },
        { status: 400 }
      );
    }

    // ユーザー情報を取得
    const user = await getUserById(resetToken.userId);
    if (!user) {
      return NextResponse.json(
        { error: 'ユーザーが見つかりません' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      valid: true,
      email: resetToken.email,
    }, { status: 200 });

  } catch (error) {
    console.error('Reset password token verification error:', error);
    return NextResponse.json(
      { error: 'トークンの検証に失敗しました' },
      { status: 500 }
    );
  }
}

/**
 * パスワードリセット実行
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, password } = body;

    if (!token) {
      return NextResponse.json(
        { error: 'トークンが指定されていません' },
        { status: 400 }
      );
    }

    if (!password) {
      return NextResponse.json(
        { error: 'パスワードを入力してください' },
        { status: 400 }
      );
    }

    // パスワードの長さチェック
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'パスワードは8文字以上である必要があります' },
        { status: 400 }
      );
    }

    // トークンを検証
    const resetToken = await getPasswordResetTokenByToken(token);

    if (!resetToken) {
      return NextResponse.json(
        { error: '無効または期限切れのトークンです' },
        { status: 400 }
      );
    }

    // ユーザー情報を取得
    const user = await getUserById(resetToken.userId);
    if (!user) {
      return NextResponse.json(
        { error: 'ユーザーが見つかりません' },
        { status: 404 }
      );
    }

    // パスワードをハッシュ化して更新
    const hashedPassword = await hashPassword(password);
    await updateUser(user.id, {
      password: hashedPassword,
    });

    // トークンを使用済みにマーク
    await markPasswordResetTokenAsUsed(token);

    // 本番環境では機密情報をログに出力しない
    if (process.env.NODE_ENV === 'development') {
      console.log('Password reset completed:', {
        userId: user.id,
        email: user.email,
        tokenId: resetToken.id,
      });
    }

    return NextResponse.json({
      success: true,
      message: 'パスワードをリセットしました。新しいパスワードでログインしてください。',
    }, { status: 200 });

  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json(
      { error: 'パスワードのリセットに失敗しました' },
      { status: 500 }
    );
  }
}

