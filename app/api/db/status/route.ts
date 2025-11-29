import { NextResponse } from 'next/server';
import { isDatabaseAvailable, shouldUseDatabase, testConnection } from '@/lib/db';

export async function GET() {
  try {
    // 環境変数の状態を確認
    const envVars = {
      POSTGRES_URL: !!process.env.POSTGRES_URL,
      POSTGRES_PRISMA_URL: !!process.env.POSTGRES_PRISMA_URL,
      POSTGRES_URL_NON_POOLING: !!process.env.POSTGRES_URL_NON_POOLING,
      STORAGE_URL: !!process.env.STORAGE_URL,
      STORAGE_PRISMA_URL: !!process.env.STORAGE_PRISMA_URL,
      STORAGE_URL_NON_POOLING: !!process.env.STORAGE_URL_NON_POOLING,
      USE_DATABASE: process.env.USE_DATABASE,
      VERCEL: process.env.VERCEL,
      VERCEL_ENV: process.env.VERCEL_ENV,
      NODE_ENV: process.env.NODE_ENV,
    };

    // データベースが利用可能か
    const dbAvailable = isDatabaseAvailable();
    
    // データベースを使用すべきか
    const shouldUseDb = shouldUseDatabase();
    
    // 実際の接続テスト
    let connectionTest: { success: boolean; error?: string } = { success: false };
    if (dbAvailable && shouldUseDb) {
      try {
        const connected = await testConnection();
        connectionTest = { success: connected };
      } catch (error: any) {
        connectionTest = { 
          success: false, 
          error: error?.message || 'Unknown error' 
        };
      }
    }

    // 現在使用しているストレージタイプ
    const storageType = shouldUseDb ? 'database' : 'filesystem';

    // Vercel環境かどうか
    const isVercel = process.env.VERCEL === '1' || process.env.VERCEL_ENV !== undefined;

    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: {
        isVercel,
        nodeEnv: process.env.NODE_ENV,
        vercelEnv: process.env.VERCEL_ENV,
      },
      database: {
        available: dbAvailable,
        shouldUse: shouldUseDb,
        storageType,
        connectionTest,
      },
      environmentVariables: {
        ...envVars,
        // セキュリティのため、実際の値は表示しない（存在するかどうかのみ）
        POSTGRES_URL_value: process.env.POSTGRES_URL 
          ? `${process.env.POSTGRES_URL.substring(0, 20)}...` 
          : null,
        POSTGRES_PRISMA_URL_value: process.env.POSTGRES_PRISMA_URL 
          ? `${process.env.POSTGRES_PRISMA_URL.substring(0, 20)}...` 
          : null,
        PRISMA_DATABASE_URL_value: process.env.PRISMA_DATABASE_URL 
          ? `${process.env.PRISMA_DATABASE_URL.substring(0, 20)}...` 
          : null,
        STORAGE_PRISMA_URL_value: process.env.STORAGE_PRISMA_URL 
          ? `${process.env.STORAGE_PRISMA_URL.substring(0, 20)}...` 
          : null,
      },
      summary: {
        message: shouldUseDb 
          ? (connectionTest.success 
              ? '✅ データベースに接続されています' 
              : '⚠️ データベースを使用する設定ですが、接続に失敗しています')
          : '📁 ファイルシステムを使用しています',
        recommendation: !dbAvailable 
          ? '環境変数（POSTGRES_URL等）が設定されていません'
          : !shouldUseDb
          ? 'データベースは利用可能ですが、現在はファイルシステムを使用しています'
          : !connectionTest.success
          ? 'データベース接続に失敗しています。環境変数を確認してください'
          : 'データベース接続は正常です',
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        status: 'error',
        error: error?.message || 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

