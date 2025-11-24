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
  } catch (error: any) {
    console.error('Registration error:', error);
    console.error('Error details:', {
      message: error?.message,
      code: error?.code,
      stack: error?.stack,
    });
    
    // ファイルシステムエラーの場合、より詳細なメッセージを返す
    if (error?.code === 'EACCES' || error?.code === 'EROFS' || error?.message?.includes('read-only')) {
      console.error('File system is read-only. This is expected in Vercel production environment.');
      return NextResponse.json(
        { 
          error: '本番環境ではデータベースが必要です。現在、ファイルベースのストレージは使用できません。' 
        },
        { status: 503 }
      );
    }
    
    return NextResponse.json(
      { 
        error: '登録に失敗しました',
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined
      },
      { status: 500 }
    );
  }
}

