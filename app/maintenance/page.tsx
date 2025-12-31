'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';

export default function MaintenancePage() {
  const router = useRouter();
  const [message, setMessage] = useState('現在メンテナンス中です。ご迷惑をおかけいたします。');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 管理者チェック
    const checkAdmin = async () => {
      try {
        const adminRes = await fetch('/api/admin/check');
        const adminData = await adminRes.json();
        
        if (adminData.isAdmin) {
          // 管理者の場合は通常のページにリダイレクト
          router.push('/posts');
          return;
        }
      } catch (err) {
        // エラー時はメンテナンスページを表示
      }
      
      // メンテナンスメッセージを取得
      try {
        const res = await fetch('/api/system/maintenance');
        const data = await res.json();
        if (data.message) {
          setMessage(data.message);
        }
      } catch (err) {
        // エラー時はデフォルトメッセージを使用
      } finally {
        setLoading(false);
      }
    };
    
    checkAdmin();
  }, [router]);

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center py-12">
          <div className="text-center text-gray-700 dark:text-gray-300">
            <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto"></div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center py-12">
        <div className="max-w-md mx-auto px-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 text-center">
            <div className="mb-6">
              <svg
                className="w-24 h-24 mx-auto text-indigo-600 dark:text-indigo-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              メンテナンス中
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6 whitespace-pre-line">
              {message}
            </p>
            <div className="flex items-center justify-center mb-6">
              <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

