import { NextRequest, NextResponse } from 'next/server';
import { createUser, getUserByEmail } from '@/lib/storage';
import { User } from '@/types';
import { validateContent, validatePassword, validateEmail, validateUrl } from '@/lib/contentFilter';
import { hashPassword } from '@/lib/password';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, email, password, creatorType, bio, portfolioUrls } = body;

    if (!username || !email || !password || !creatorType) {
      return NextResponse.json(
        { error: '必須項目が不足しています' },
        { status: 400 }
      );
    }

    // パスワードバリデーション
    const passwordError = validatePassword(password);
    if (passwordError) {
      return NextResponse.json(
        { error: passwordError },
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

    // コンテンツフィルタリング
    const usernameError = validateContent(username);
    if (usernameError) {
      return NextResponse.json(
        { error: usernameError },
        { status: 400 }
      );
    }

    if (bio) {
      const bioError = validateContent(bio);
      if (bioError) {
        return NextResponse.json(
          { error: bioError },
          { status: 400 }
        );
      }
    }

    // メールアドレスの重複チェック
    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      return NextResponse.json(
        { error: 'このメールアドレスは既に登録されています' },
        { status: 400 }
      );
    }

    // URLのバリデーションとフィルタリング
    const filteredUrls = portfolioUrls 
      ? portfolioUrls.filter((url: string) => {
          const trimmedUrl = url.trim();
          if (trimmedUrl.length === 0) return false;
          const urlError = validateUrl(trimmedUrl);
          return urlError === null; // エラーがない場合のみ含める
        })
      : [];
    
    // URLバリデーションエラーのチェック
    if (portfolioUrls && portfolioUrls.some((url: string) => {
      const trimmedUrl = url.trim();
      return trimmedUrl.length > 0 && validateUrl(trimmedUrl) !== null;
    })) {
      return NextResponse.json(
        { error: '無効なURLが含まれています。httpまたはhttpsのURLのみ使用できます。' },
        { status: 400 }
      );
    }

    // パスワードをハッシュ化
    const hashedPassword = await hashPassword(password);

    const user = await createUser({
      username,
      email,
      password: hashedPassword,
      creatorType,
      bio: bio || '',
      portfolioUrls: filteredUrls.length > 0 ? filteredUrls : undefined,
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: '登録に失敗しました' },
      { status: 500 }
    );
  }
}

