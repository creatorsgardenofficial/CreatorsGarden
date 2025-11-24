import { NextRequest, NextResponse } from 'next/server';
import { deleteCsrfToken } from '@/lib/csrf';

export async function POST(request: NextRequest) {
  const userId = request.cookies.get('userId')?.value;
  
  // CSRFトークンを削除
  if (userId) {
    deleteCsrfToken(userId);
  }
  
  const response = NextResponse.json({ message: 'ログアウトしました' }, { status: 200 });
  
  // Cookieを削除
  response.cookies.delete('userId');
  response.cookies.delete('csrfToken');
  
  return response;
}

