import { NextRequest, NextResponse } from 'next/server';
import { getUserById, updateUser, updatePostsByUserId } from '@/lib/storage';
import { validateContent, validateUrl } from '@/lib/contentFilter';

export async function GET(request: NextRequest) {
  try {
    const userId = request.cookies.get('userId')?.value;

    if (!userId) {
      return NextResponse.json(
        { error: 'ログインが必要です' },
        { status: 401 }
      );
    }

    const user = await getUserById(userId);

    if (!user) {
      return NextResponse.json(
        { error: 'ユーザーが見つかりません' },
        { status: 404 }
      );
    }

    // 利用停止チェック
    if (user.isActive === false) {
      return NextResponse.json(
        { error: 'このアカウントは利用停止されています' },
        { status: 403 }
      );
    }

    return NextResponse.json({ user }, { status: 200 });
  } catch (error) {
    console.error('Get profile error:', error);
    return NextResponse.json(
      { error: 'プロフィールの取得に失敗しました' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const userId = request.cookies.get('userId')?.value;

    if (!userId) {
      return NextResponse.json(
        { error: 'ログインが必要です' },
        { status: 401 }
      );
    }

    const user = await getUserById(userId);

    if (!user) {
      return NextResponse.json(
        { error: 'ユーザーが見つかりません' },
        { status: 404 }
      );
    }

    // 利用停止チェック
    if (user.isActive === false) {
      return NextResponse.json(
        { error: 'このアカウントは利用停止されています' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { username, bio, creatorType, portfolioUrls } = body;

    // 文字数制限
    const MAX_BIO_LENGTH = 500;

    // コンテンツフィルタリング
    if (username) {
      const usernameError = validateContent(username);
      if (usernameError) {
        return NextResponse.json(
          { error: usernameError },
          { status: 400 }
        );
      }
    }

    if (bio !== undefined) {
      // 文字数制限チェック
      if (bio.length > MAX_BIO_LENGTH) {
        return NextResponse.json(
          { error: `自己紹介は${MAX_BIO_LENGTH}文字以内で入力してください（現在: ${bio.length}文字）` },
          { status: 400 }
        );
      }
      
      const bioError = validateContent(bio);
      if (bioError) {
        return NextResponse.json(
          { error: bioError },
          { status: 400 }
        );
      }
    }

    // URLのバリデーションとフィルタリング（説明付きURL対応）
    const MAX_URL_DESCRIPTION_LENGTH = 100;
    let filteredUrls: Array<{ url: string; description?: string }> | string[] = [];
    
    if (portfolioUrls) {
      // オブジェクト配列か文字列配列かを判定
      if (Array.isArray(portfolioUrls) && portfolioUrls.length > 0) {
        const isObjectArray = typeof portfolioUrls[0] === 'object' && portfolioUrls[0] !== null;
        
        if (isObjectArray) {
          // 新しい形式（オブジェクト配列）
          // 最大3つまで
          const validUrls = (portfolioUrls as Array<{ url: string; description?: string }>)
            .filter(item => item.url && item.url.trim().length > 0);
          
          if (validUrls.length > 3) {
            return NextResponse.json(
              { error: '作品URLは最大3つまで登録できます' },
              { status: 400 }
            );
          }
          
          // URL説明の文字数チェックとURLのバリデーション
          for (const item of validUrls) {
            if (item.description && item.description.length > MAX_URL_DESCRIPTION_LENGTH) {
              return NextResponse.json(
                { error: `URL説明は${MAX_URL_DESCRIPTION_LENGTH}文字以内で入力してください（現在: ${item.description.length}文字）` },
                { status: 400 }
              );
            }
            
            const urlError = validateUrl(item.url.trim());
            if (urlError) {
              return NextResponse.json(
                { error: urlError },
                { status: 400 }
              );
            }
          }
          
          filteredUrls = validUrls.map(item => ({
            url: item.url.trim(),
            description: item.description?.trim() || undefined,
          }));
        } else {
          // 古い形式（文字列配列）- 後方互換性
          const validUrls = (portfolioUrls as string[])
            .filter(url => url && url.trim().length > 0);
          
          if (validUrls.length > 3) {
            return NextResponse.json(
              { error: '作品URLは最大3つまで登録できます' },
              { status: 400 }
            );
          }
          
          for (const url of validUrls) {
            const urlError = validateUrl(url.trim());
            if (urlError) {
              return NextResponse.json(
                { error: urlError },
                { status: 400 }
              );
            }
          }
          
          filteredUrls = validUrls.map(url => url.trim());
        }
      }
    } else {
      // portfolioUrlsが送信されていない場合は既存の値を保持
      filteredUrls = user.portfolioUrls || [];
    }

    // creatorTypeが明示的に送信されている場合はそれを使用、そうでなければ現在の値を使用
    const newCreatorType = creatorType !== undefined ? creatorType : user.creatorType;
    const creatorTypeChanged = creatorType !== undefined && creatorType !== user.creatorType;

    const updatedUser = await updateUser(userId, {
      username: username || user.username,
      bio: bio !== undefined ? bio : user.bio,
      creatorType: newCreatorType,
      portfolioUrls: portfolioUrls !== undefined ? filteredUrls : user.portfolioUrls,
    });

    // クリエイタータイプが変更された場合、そのユーザーのすべての投稿のcreatorTypeも更新
    if (creatorTypeChanged && updatedUser) {
      await updatePostsByUserId(userId, {
        creatorType: newCreatorType,
      });
    }

    return NextResponse.json({ user: updatedUser }, { status: 200 });
  } catch (error) {
    console.error('Update profile error:', error);
    return NextResponse.json(
      { error: 'プロフィールの更新に失敗しました' },
      { status: 500 }
    );
  }
}

