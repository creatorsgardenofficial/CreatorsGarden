import { NextRequest, NextResponse } from 'next/server';
import { createFeedback, getUserById } from '@/lib/storage';
import { FeedbackSubject } from '@/types';
import { validateEmail } from '@/lib/contentFilter';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, subject, message } = body;

    if (!subject || !message) {
      return NextResponse.json(
        { error: '必須項目が不足しています' },
        { status: 400 }
      );
    }

    // 件名のバリデーション
    const validSubjects: FeedbackSubject[] = ['feature', 'bug', 'improvement', 'other'];
    if (!validSubjects.includes(subject)) {
      return NextResponse.json(
        { error: '無効な件名です' },
        { status: 400 }
      );
    }

    // ログインユーザーのIDを取得（オプショナル）
    const userId = request.cookies.get('userId')?.value;
    let userEmail: string | undefined;
    if (userId) {
      const user = await getUserById(userId);
      if (user) {
        userEmail = user.email;
      }
    }

    // メールアドレスのバリデーション（提供されている場合）
    const finalEmail = email || userEmail;
    if (finalEmail) {
      const emailError = validateEmail(finalEmail);
      if (emailError) {
        return NextResponse.json(
          { error: emailError },
          { status: 400 }
        );
      }
    }

    const feedback = await createFeedback({
      name: name || undefined,
      email: finalEmail || undefined,
      userId: userId || undefined,
      subject,
      message,
    });

    return NextResponse.json({ feedback }, { status: 201 });
  } catch (error) {
    console.error('Create feedback error:', error);
    return NextResponse.json(
      { error: 'フィードバックの送信に失敗しました' },
      { status: 500 }
    );
  }
}

