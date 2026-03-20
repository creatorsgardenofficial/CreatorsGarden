import { NextRequest, NextResponse } from 'next/server';
import { getSystemSettings } from '@/lib/storage';

export async function GET(request: NextRequest) {
  try {
    const settings = await getSystemSettings();
    if (!settings) {
      return NextResponse.json({
        isMaintenance: false,
        message: '現在メンテナンス中です。ご迷惑をおかけいたします。',
      }, { status: 200 });
    }
    return NextResponse.json({
      isMaintenance: settings.isMaintenance || false,
      message: settings.maintenanceMessage || '現在メンテナンス中です。ご迷惑をおかけいたします。',
    }, { status: 200 });
  } catch (error) {
    return NextResponse.json({
      isMaintenance: false,
      message: '現在メンテナンス中です。ご迷惑をおかけいたします。',
    }, { status: 200 });
  }
}

