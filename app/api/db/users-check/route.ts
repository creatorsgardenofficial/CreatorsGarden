import { NextResponse } from 'next/server';
import { getUsers } from '@/lib/storage';
import { shouldUseDatabase, isDatabaseAvailable } from '@/lib/db';
import { promises as fs } from 'fs';
import path from 'path';

export async function GET() {
  try {
    const DATA_DIR = path.join(process.cwd(), 'data');
    const USERS_FILE = path.join(DATA_DIR, 'users.json');
    
    // 現在のストレージタイプを確認
    const dbAvailable = isDatabaseAvailable();
    const shouldUseDb = shouldUseDatabase();
    const storageType = shouldUseDb ? 'database' : 'filesystem';
    
    // データベースからユーザーを取得
    let dbUsers: any[] = [];
    let dbError: string | null = null;
    if (dbAvailable) {
      try {
        const { getUsers: getUsersDb } = await import('@/lib/storage-db');
        dbUsers = await getUsersDb();
      } catch (error: any) {
        dbError = error?.message || 'Unknown error';
      }
    }
    
    // ファイルシステムからユーザーを取得
    let fsUsers: any[] = [];
    let fsError: string | null = null;
    let fsFileExists = false;
    try {
      fsFileExists = await fs.access(USERS_FILE).then(() => true).catch(() => false);
      if (fsFileExists) {
        const data = await fs.readFile(USERS_FILE, 'utf-8');
        fsUsers = JSON.parse(data);
      }
    } catch (error: any) {
      fsError = error?.message || 'Unknown error';
    }
    
    // 現在使用しているストレージからユーザーを取得
    let currentUsers: any[] = [];
    let currentError: string | null = null;
    try {
      currentUsers = await getUsers();
    } catch (error: any) {
      currentError = error?.message || 'Unknown error';
    }
    
    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      storage: {
        type: storageType,
        databaseAvailable: dbAvailable,
        shouldUseDatabase: shouldUseDb,
      },
      users: {
        database: {
          count: dbUsers.length,
          exists: dbUsers.length > 0,
          error: dbError,
          sample: dbUsers.length > 0 ? {
            id: dbUsers[0].id,
            email: dbUsers[0].email,
            username: dbUsers[0].username,
          } : null,
        },
        filesystem: {
          count: fsUsers.length,
          exists: fsFileExists,
          filePath: USERS_FILE,
          error: fsError,
          sample: fsUsers.length > 0 ? {
            id: fsUsers[0].id,
            email: fsUsers[0].email,
            username: fsUsers[0].username,
          } : null,
        },
        current: {
          count: currentUsers.length,
          source: storageType,
          error: currentError,
          sample: currentUsers.length > 0 ? {
            id: currentUsers[0].id,
            email: currentUsers[0].email,
            username: currentUsers[0].username,
          } : null,
        },
      },
      summary: {
        message: currentUsers.length > 0
          ? `✅ 現在${storageType}から${currentUsers.length}人のユーザーが見つかりました`
          : `⚠️ 現在${storageType}にユーザーが存在しません`,
        recommendation: !shouldUseDb && dbUsers.length > 0 && fsUsers.length === 0
          ? 'データベースにユーザーが存在しますが、ファイルシステムには存在しません。USE_DATABASE=trueを設定するか、データを移行してください。'
          : shouldUseDb && dbUsers.length === 0 && fsUsers.length > 0
          ? 'ファイルシステムにユーザーが存在しますが、データベースには存在しません。データを移行するか、USE_DATABASE=falseに設定してください。'
          : currentUsers.length === 0
          ? 'ユーザーが存在しません。新規登録が必要です。'
          : 'ユーザーデータは正常に読み込まれています。',
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

