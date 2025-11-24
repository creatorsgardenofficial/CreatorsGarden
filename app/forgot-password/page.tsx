'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetLink, setResetLink] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setResetLink(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'パスワードリセット申請に失敗しました');
        setLoading(false);
        return;
      }

      setSuccess(true);
      // 開発環境ではリンクを表示
      if (data.resetLink) {
        setResetLink(data.resetLink);
      }
      setLoading(false);
    } catch (err) {
      setError('パスワードリセット申請に失敗しました');
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-12">
        <div className="max-w-md mx-auto px-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6 text-center">
              パスワードを忘れた場合
            </h1>

            {error && (
              <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400">
                {error}
              </div>
            )}

            {success && (
              <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-700 dark:text-green-400">
                <p className="font-semibold mb-2">メールを送信しました</p>
                <p className="text-sm">
                  メールアドレスが登録されている場合、パスワードリセットリンクを送信しました。
                  メールフォルダを確認してください。
                </p>
                {resetLink && (
                  <div className="mt-4 p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                      開発環境用リンク:
                    </p>
                    <a
                      href={resetLink}
                      className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline break-all"
                    >
                      {resetLink}
                    </a>
                  </div>
                )}
              </div>
            )}

            {!success && (
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
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    登録時のメールアドレスを入力してください。パスワードリセットリンクを送信します。
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? '送信中...' : '送信'}
                </button>
              </form>
            )}

            <p className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
              <Link href="/login" className="text-indigo-600 dark:text-indigo-400 hover:underline">
                ログインページに戻る
              </Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

