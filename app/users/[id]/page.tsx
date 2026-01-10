'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { User, Post, PostType, CreatorType } from '@/types';
import { creatorTypeLabels } from '@/lib/creatorTypes';

export default function UserProfilePage() {
  const params = useParams();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (params.id) {
      fetchUserProfile();
      fetchUserPosts();
    }
  }, [params.id]);

  const fetchUserProfile = async () => {
    try {
      const res = await fetch(`/api/users/${params.id}`);
      const data = await res.json();

      if (!res.ok) {
        if (res.status === 404) {
          setError('ユーザーが見つかりません');
        } else {
          setError(data.error || 'プロフィールの取得に失敗しました');
        }
        setLoading(false);
        return;
      }

      if (data.user) {
        setUser(data.user);
      }
      setLoading(false);
    } catch (err) {
      setError('プロフィールの取得に失敗しました');
      setLoading(false);
    }
  };

  const fetchUserPosts = async () => {
    try {
      if (!params.id) return;
      const postsRes = await fetch(`/api/posts?userId=${params.id}`);
      const postsData = await postsRes.json();
      setPosts(postsData.posts || []);
    } catch (err) {
      console.error('Failed to fetch user posts:', err);
    }
  };


  const postTypeLabels: Record<PostType, string> = {
    collab: '🤝 コラボ募集',
    idea: '💡 作品紹介',
    seeking: '🔍 パートナー探し',
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-gray-300 border-t-indigo-600 rounded-full animate-spin"></div>
        </div>
      </>
    );
  }

  if (error || !user) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-8">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
              <div className="text-center">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                  {error || 'ユーザーが見つかりません'}
                </h1>
                <Link
                  href="/posts"
                  className="text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  投稿一覧に戻る
                </Link>
              </div>
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
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 mb-6">
            <div className="mb-6">
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
                {user.username}
              </h1>
              <div className="flex items-center gap-4">
                <span className="px-4 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300 rounded-full text-sm font-semibold">
                  {creatorTypeLabels[user.creatorType]}
                </span>
                {user.publicId && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      表示用ID:
                    </span>
                    <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 rounded-lg text-sm font-mono font-semibold">
                      {user.publicId}
                    </span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(user.publicId || '');
                        alert('表示用IDをクリップボードにコピーしました');
                      }}
                      className="text-gray-500 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors flex-shrink-0"
                      title="コピー"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                  </div>
                )}
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  登録日: {formatDate(user.createdAt)}
                </span>
              </div>
            </div>

            {user.bio && (
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  自己紹介
                </h2>
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {user.bio}
                </p>
              </div>
            )}

            {user.portfolioUrls && user.portfolioUrls.length > 0 && (
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  作品URL
                </h2>
                <div className="space-y-2">
                  {user.portfolioUrls.map((item, index) => {
                    const url = typeof item === 'string' ? item : item.url;
                    const description = typeof item === 'string' ? undefined : item.description;
                    return (
                      <a
                        key={index}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-indigo-600 dark:text-indigo-400 hover:underline break-all"
                      >
                        {description || url}
                      </a>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              投稿一覧 ({posts.length})
            </h2>
          </div>

          <div className="grid gap-6">
            {posts.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 text-center">
                <p className="text-gray-500 dark:text-gray-400">
                  まだ投稿がありません
                </p>
              </div>
            ) : (
              posts.map((post) => (
                <Link
                  key={post.id}
                  href={`/posts/${post.id}`}
                  className="block bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="inline-block px-3 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300 rounded-full text-sm font-semibold">
                          {postTypeLabels[post.type]}
                        </span>
                        <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
                          post.status === 'open'
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                            : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                        }`}>
                          {post.status === 'open' ? 'メンバー募集中' : 'メンバー決定'}
                        </span>
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                        {post.title}
                      </h3>
                    </div>
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                    {post.content}
                  </p>
                  <div className="flex items-center gap-2 flex-wrap">
                    {post.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-1 bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300 rounded-full text-sm"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                  <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                    {formatDate(post.createdAt)}
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
}

