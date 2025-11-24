import { NextRequest, NextResponse } from 'next/server';
import { getUserById } from '@/lib/storage';
import { isAdmin } from '@/lib/admin';

export async function GET(request: NextRequest) {
  try {
    const userId = request.cookies.get('userId')?.value;

    if (!userId) {
      return NextResponse.json({ isAdmin: false }, { status: 200 });
    }

    const user = await getUserById(userId);
    if (!user) {
      return NextResponse.json({ isAdmin: false }, { status: 200 });
    }

    return NextResponse.json({ isAdmin: isAdmin(user.email) }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ isAdmin: false }, { status: 200 });
  }
}

