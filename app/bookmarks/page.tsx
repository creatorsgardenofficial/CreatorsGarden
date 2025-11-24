'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { Post } from '@/types';

interface BookmarkWithPost {
  id: string;
  userId: string;
  postId: string;
  createdAt: string;
  post: Post;
}

export default function BookmarksPage() {
  const router = useRouter();
  const [bookmarks, setBookmarks] = useState<BookmarkWithPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    fetchUser();
    fetchBookmarks();
  }, []);

  const fetchUser = async () => {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      const data = await res.json();
      if (data.user) {
        setUser(data.user);
      } else {
        router.push('/login');
      }
    } catch (error) {
      console.error('Failed to fetch user:', error);
      router.push('/login');
    }
  };

  const fetchBookmarks = async () => {
    try {
      const res = await fetch('/api/bookmarks', { credentials: 'include' });
      const data = await res.json();
      if (res.ok) {
        setBookmarks(data.bookmarks || []);
      }
    } catch (error) {
      console.error('Failed to fetch bookmarks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveBookmark = async (postId: string) => {
    try {
      const res = await fetch(`/api/bookmarks?postId=${postId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (res.ok) {
        setBookmarks(prev => prev.filter(b => b.postId !== postId));
      } else {
        const data = await res.json();
        alert(data.error || 'ブックマークの削除に失敗しました');
      }
    } catch (error) {
      console.error('Failed to remove bookmark:', error);
      alert('エラーが発生しました');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const postTypeLabels: Record<string, string> = {
    collab: 'コラボ募集',
    idea: 'アイデア共有',
    seeking: 'パートナー探し',
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <p className="text-gray-600 dark:text-gray-400">読み込み中...</p>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white">
              ブックマーク
            </h1>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {bookmarks.length}件のブックマーク
            </div>
          </div>

          {bookmarks.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 sm:p-12 text-center">
              <svg
                className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 text-gray-400 dark:text-gray-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                />
              </svg>
              <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-400 mb-4">
                ブックマークがありません
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-500 mb-6">
                気になった投稿をブックマークして、後で確認できます
              </p>
              <Link
                href="/posts"
                className="inline-block px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
              >
                投稿一覧を見る
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {bookmarks.map((bookmark) => (
                <div
                  key={bookmark.id}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 sm:p-6 hover:shadow-xl transition-shadow relative"
                >
                  <button
                    onClick={() => handleRemoveBookmark(bookmark.postId)}
                    className="absolute top-4 right-4 p-2 text-gray-400 hover:text-yellow-600 dark:hover:text-yellow-400 transition-colors"
                    title="ブックマークを解除"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                      />
                    </svg>
                  </button>

                  <Link href={`/posts/${bookmark.postId}`}>
                    <div className="mb-3 sm:mb-4">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className="inline-block px-2 sm:px-3 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300 rounded-full text-xs sm:text-sm font-semibold">
                          {postTypeLabels[bookmark.post.type]}
                        </span>
                        <span className={`inline-block px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-semibold ${
                          bookmark.post.status === 'open' 
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' 
                            : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                        }`}>
                          {bookmark.post.status === 'open' ? 'メンバー募集中' : 'メンバー決定'}
                        </span>
                      </div>
                      <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 dark:text-white mb-2">
                        {bookmark.post.title}
                      </h3>
                    </div>
                    
                    <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-3 sm:mb-4 line-clamp-3">
                      {bookmark.post.content}
                    </p>

                    {bookmark.post.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-3 sm:mb-4">
                        {bookmark.post.tags.map((tag) => (
                          <span
                            key={tag}
                            className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded text-xs"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                      <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                        投稿者: {bookmark.post.username}
                      </span>
                      <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(bookmark.post.createdAt)}
                      </span>
                    </div>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

