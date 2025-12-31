'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';

export default function ReactivatePage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [passwordResetEmail, setPasswordResetEmail] = useState('');
  const [passwordResetLoading, setPasswordResetLoading] = useState(false);
  const [passwordResetSuccess, setPasswordResetSuccess] = useState(false);
  const [passwordResetError, setPasswordResetError] = useState('');
  const [resetLink, setResetLink] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/reactivate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'アカウントの復旧に失敗しました');
        setLoading(false);
        return;
      }

      // 復旧成功
      router.push('/posts');
    } catch (err) {
      setError('アカウントの復旧に失敗しました');
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordResetError('');
    setPasswordResetSuccess(false);
    setPasswordResetLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: passwordResetEmail }),
      });

      const data = await res.json();

      if (!res.ok) {
        setPasswordResetError(data.error || 'パスワードリセット申請に失敗しました');
        setPasswordResetLoading(false);
        return;
      }

      setPasswordResetSuccess(true);
      if (data?.resetLink) {
        setResetLink(data.resetLink);
      }
      setPasswordResetLoading(false);
    } catch (err) {
      setPasswordResetError('パスワードリセット申請に失敗しました');
      setPasswordResetLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-12">
        <div className="max-w-md mx-auto px-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6 text-center">
              アカウントを復旧する
            </h1>

            <p className="mb-6 text-sm text-gray-600 dark:text-gray-400">
              退会済みのアカウントを復旧するには、登録時のメールアドレスとパスワードを入力してください。
            </p>

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
                {loading ? '復旧中...' : 'アカウントを復旧する'}
              </button>
            </form>

            <p className="mt-4 text-center text-sm text-gray-600 dark:text-gray-400">
              <button
                type="button"
                onClick={() => {
                  setShowPasswordReset(!showPasswordReset);
                  setPasswordResetEmail(email);
                  setPasswordResetError('');
                  setPasswordResetSuccess(false);
                }}
                className="text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                パスワードを忘れた場合
              </button>
            </p>

            {showPasswordReset && (
              <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <h2 className="text-lg font-semibold text-blue-900 dark:text-blue-200 mb-3">
                  パスワードをリセット
                </h2>
                {passwordResetSuccess ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-700 dark:text-green-400">
                      <p className="mb-2">
                        メールアドレスが登録されている場合、パスワードリセットリンクを送信しました。
                      </p>
                      <p className="text-sm">
                        メールボックスを確認して、パスワードリセットリンクをクリックしてください。
                        パスワードリセット後、アカウントは自動的に復旧されます。
                      </p>
                    </div>
                    {resetLink && (
                      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                        <p className="text-sm text-blue-800 dark:text-blue-300 mb-2">
                          開発環境: 以下のリンクをクリックしてパスワードをリセットしてください。
                        </p>
                        <Link
                          href={resetLink}
                          className="text-blue-600 dark:text-blue-400 hover:underline break-all"
                        >
                          {resetLink}
                        </Link>
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-blue-800 dark:text-blue-300 mb-4">
                      登録時のメールアドレスを入力してください。パスワードリセットリンクを送信します。
                      パスワードリセット後、アカウントは自動的に復旧されます。
                    </p>
                    {passwordResetError && (
                      <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400">
                        {passwordResetError}
                      </div>
                    )}
                    <form onSubmit={handlePasswordReset} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-blue-900 dark:text-blue-200 mb-2">
                          メールアドレス
                        </label>
                        <input
                          type="email"
                          required
                          value={passwordResetEmail}
                          onChange={(e) => setPasswordResetEmail(e.target.value)}
                          className="w-full px-4 py-2 border border-blue-300 dark:border-blue-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                          placeholder="登録時のメールアドレス"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={passwordResetLoading}
                        className="w-full py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                      >
                        {passwordResetLoading ? '送信中...' : 'パスワードリセットリンクを送信'}
                      </button>
                    </form>
                  </>
                )}
              </div>
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

