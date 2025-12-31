'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showReactivate, setShowReactivate] = useState(false);
  const [reactivating, setReactivating] = useState(false);
  const [checkingMaintenance, setCheckingMaintenance] = useState(true);

  // メンテナンス状態をチェック
  useEffect(() => {
    const checkMaintenance = async () => {
      try {
        // 管理者チェック
        const adminRes = await fetch('/api/admin/check');
        const adminData = await adminRes.json();
        
        if (adminData.isAdmin) {
          // 管理者の場合はメンテナンスチェックをスキップ
          setCheckingMaintenance(false);
          return;
        }

        // メンテナンス状態をチェック
        const res = await fetch('/api/system/maintenance');
        const data = await res.json();
        
        if (data.isMaintenance === true) {
          // メンテナンス中はメンテナンスページにリダイレクト
          router.push('/maintenance');
          return;
        }
        
        setCheckingMaintenance(false);
      } catch (err) {
        // エラー時は通常通り表示
        setCheckingMaintenance(false);
      }
    };
    
    checkMaintenance();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        // 退会済みアカウントの場合、復旧可能であることを示す
        if (data.canReactivate) {
          setShowReactivate(true);
          setError('');
        } else {
          setError(data.error || 'ログインに失敗しました');
        }
        setLoading(false);
        return;
      }

      router.push('/posts');
    } catch (err) {
      setError('ログインに失敗しました');
      setLoading(false);
    }
  };

  if (checkingMaintenance) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-12 flex items-center justify-center">
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
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-12">
        <div className="max-w-md mx-auto px-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6 text-center">
              ログイン
            </h1>

            {error && (
              <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  メールアドレス
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  placeholder="登録時のメールアドレス"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  パスワード
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  placeholder="パスワード"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'ログイン中...' : 'ログイン'}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
              アカウントをお持ちでない方は{' '}
              <Link href="/register" className="text-indigo-600 dark:text-indigo-400 hover:underline">
                新規登録
              </Link>
            </p>

            <p className="mt-4 text-center text-sm text-gray-600 dark:text-gray-400">
              <Link href="/forgot-password" className="text-indigo-600 dark:text-indigo-400 hover:underline">
                パスワードを忘れた場合
              </Link>
            </p>

            <p className="mt-4 text-center text-sm text-gray-600 dark:text-gray-400">
              <Link href="/reactivate" className="text-indigo-600 dark:text-indigo-400 hover:underline">
                アカウントを復旧する
              </Link>
            </p>

            {showReactivate && (
              <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="text-sm text-blue-800 dark:text-blue-300 mb-3">
                  このアカウントは退会済みです。アカウントを復旧しますか？
                </p>
                <button
                  onClick={async () => {
                    setReactivating(true);
                    try {
                      const res = await fetch('/api/auth/reactivate', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email, password }),
                      });

                      const data = await res.json();

                      if (!res.ok) {
                        setError(data.error || 'アカウントの復旧に失敗しました');
                        setReactivating(false);
                        return;
                      }

                      // 復旧成功
                      router.push('/posts');
                    } catch (err) {
                      setError('アカウントの復旧に失敗しました');
                      setReactivating(false);
                    }
                  }}
                  disabled={reactivating}
                  className="w-full py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  {reactivating ? '復旧中...' : 'アカウントを復旧する'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

