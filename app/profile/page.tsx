'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { User, Post, PostType, CreatorType } from '@/types';
import { validateContent } from '@/lib/contentFilter';
import { getPlanLimits } from '@/lib/planLimits';
import { creatorTypeLabels } from '@/lib/creatorTypes';

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    username: '',
    bio: '',
    creatorType: 'novelist' as CreatorType,
    portfolioUrls: [] as Array<{ url: string; description: string }>,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  type BumpStatus = {
    canBump: boolean;
    nextBumpAt: string | null;
    hoursRemaining: number;
    minutesRemaining: number;
    secondsRemaining: number; // クライアント側で計算
  };
  
  const [bumpStatuses, setBumpStatuses] = useState<Record<string, BumpStatus>>({});
  
  // 文字数制限
  const MAX_BIO_LENGTH = 500;
  const MAX_URL_DESCRIPTION_LENGTH = 100;

  useEffect(() => {
    fetchProfile();
    fetchUserPosts();
  }, []);

  useEffect(() => {
    // 投稿一覧が読み込まれたら、各投稿の挙げ状態を取得
    if (posts.length > 0 && user) {
      fetchAllBumpStatuses();
    }
  }, [posts, user]);

  // クールタイムのリアルタイム更新
  useEffect(() => {
    const intervals: NodeJS.Timeout[] = [];

    Object.entries(bumpStatuses).forEach(([postId, status]) => {
      if (!status.nextBumpAt || status.canBump) {
        return;
      }

      const interval = setInterval(() => {
        setBumpStatuses(prev => {
          const currentStatus = prev[postId];
          if (!currentStatus?.nextBumpAt || currentStatus.canBump) {
            return prev;
          }

          const nextBumpTime = new Date(currentStatus.nextBumpAt).getTime();
          const now = Date.now();
          const timeRemaining = nextBumpTime - now;

          if (timeRemaining <= 0) {
            // クールタイム終了
            return {
              ...prev,
              [postId]: {
                canBump: true,
                nextBumpAt: null,
                hoursRemaining: 0,
                minutesRemaining: 0,
                secondsRemaining: 0,
              },
            };
          } else {
            // 残り時間を計算
            const hours = Math.floor(timeRemaining / (60 * 60 * 1000));
            const minutes = Math.floor((timeRemaining % (60 * 60 * 1000)) / (60 * 1000));
            const seconds = Math.floor((timeRemaining % (60 * 1000)) / 1000);

            return {
              ...prev,
              [postId]: {
                ...currentStatus,
                hoursRemaining: hours,
                minutesRemaining: minutes,
                secondsRemaining: seconds,
              },
            };
          }
        });
      }, 1000); // 1秒ごとに更新

      intervals.push(interval);
    });

    return () => {
      intervals.forEach(interval => clearInterval(interval));
    };
  }, [bumpStatuses]);

  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/auth/profile');
      const data = await res.json();

      if (!res.ok) {
        if (res.status === 401) {
          router.push('/login');
          return;
        }
        // 利用停止エラーの場合、自動ログアウト
        if (res.status === 403 && data.error?.includes('利用停止')) {
          await fetch('/api/auth/logout', { method: 'POST' });
          alert('このアカウントは利用停止されています');
          router.push('/');
          return;
        }
        setError(data.error || 'プロフィールの取得に失敗しました');
        setLoading(false);
        return;
      }

      if (data.user) {
        setUser(data.user);
        // portfolioUrlsを説明付き形式に変換（後方互換性対応）
        let portfolioUrls: Array<{ url: string; description: string }> = [];
        if (data.user.portfolioUrls && data.user.portfolioUrls.length > 0) {
          if (typeof data.user.portfolioUrls[0] === 'string') {
            // 古い形式（文字列配列）
            portfolioUrls = (data.user.portfolioUrls as string[]).map(url => ({ url, description: '' }));
          } else {
            // 新しい形式（オブジェクト配列）
            portfolioUrls = (data.user.portfolioUrls as Array<{ url: string; description?: string }>).map(item => ({
              url: item.url,
              description: item.description || '',
            }));
          }
        }
        
        setEditForm({
          username: data.user.username,
          bio: data.user.bio || '',
          creatorType: data.user.creatorType,
          portfolioUrls: portfolioUrls,
        });
      }
      setLoading(false);
    } catch (err) {
      setError('プロフィールの取得に失敗しました');
      setLoading(false);
    }
  };

  const fetchUserPosts = async () => {
    try {
      const res = await fetch('/api/auth/me');
      const userData = await res.json();
      
      if (userData.user) {
        const postsRes = await fetch(`/api/posts?userId=${userData.user.id}`);
        const postsData = await postsRes.json();
        setPosts(postsData.posts || []);
      }
    } catch (err) {
      console.error('Failed to fetch user posts:', err);
    }
  };

  const fetchAllBumpStatuses = async () => {
    if (!user) return;
    
    const statuses: Record<string, BumpStatus> = {};

    // 各投稿の挙げ状態を取得
    for (const post of posts) {
      try {
        const res = await fetch(`/api/posts/${post.id}/bump`);
        const data: {
          canBump?: boolean;
          nextBumpAt?: string | null;
          hoursRemaining?: number;
          minutesRemaining?: number;
        } = await res.json();
        if (res.ok) {
          const nextBumpAt = data.nextBumpAt || null;
          let hoursRemaining = data.hoursRemaining || 0;
          let minutesRemaining = data.minutesRemaining || 0;
          let secondsRemaining = 0;

          // クールタイム中の場合、秒数も計算
          if (nextBumpAt && !data.canBump) {
            const nextBumpTime = new Date(nextBumpAt).getTime();
            const now = Date.now();
            const timeRemaining = nextBumpTime - now;
            hoursRemaining = Math.floor(timeRemaining / (60 * 60 * 1000));
            minutesRemaining = Math.floor((timeRemaining % (60 * 60 * 1000)) / (60 * 1000));
            secondsRemaining = Math.floor((timeRemaining % (60 * 1000)) / 1000);
          }

          const bumpStatus: BumpStatus = {
            canBump: data.canBump || false,
            nextBumpAt,
            hoursRemaining,
            minutesRemaining,
            secondsRemaining, // クライアント側で計算した値
          };
          statuses[post.id] = bumpStatus;
        }
      } catch (err) {
        console.error(`Failed to fetch bump status for post ${post.id}:`, err);
      }
    }

    setBumpStatuses(statuses);
  };

  const handleBump = async (postId: string) => {
    const status = bumpStatuses[postId];
    if (!status?.canBump) {
      if (status?.nextBumpAt) {
        const hours = status.hoursRemaining || 0;
        const minutes = status.minutesRemaining || 0;
        const seconds = status.secondsRemaining || 0;
        let timeStr = '';
        if (hours > 0) timeStr += `${hours}時間`;
        if (minutes > 0) timeStr += `${minutes}分`;
        if (seconds > 0) timeStr += `${seconds}秒`;
        alert(`この投稿は24時間に1回までしか挙げられません。次回可能まで: ${timeStr || '0秒'}`);
      }
      return;
    }

    try {
      const res = await fetch(`/api/posts/${postId}/bump`, {
        method: 'POST',
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 429 && data.nextBumpAt) {
          const hours = data.hoursRemaining || 0;
          const minutes = data.minutesRemaining || 0;
          const seconds = data.secondsRemaining || 0;
          let timeStr = '';
          if (hours > 0) timeStr += `${hours}時間`;
          if (minutes > 0) timeStr += `${minutes}分`;
          if (seconds > 0) timeStr += `${seconds}秒`;
          alert(`この投稿は24時間に1回までしか挙げられません。次回可能まで: ${timeStr || '0秒'}`);
        } else {
          alert(data.error || '投稿の挙げに失敗しました');
        }
        return;
      }

      alert('投稿を挙げました！投稿一覧の上位に表示されます。');
      fetchUserPosts(); // 投稿一覧を再取得
      fetchAllBumpStatuses(); // クールタイム情報を更新
    } catch (error) {
      alert('投稿の挙げに失敗しました');
    }
  };

  const handleEdit = () => {
    setEditing(true);
  };

  const handleCancel = () => {
    setEditing(false);
    if (user) {
      // portfolioUrlsを説明付き形式に変換（後方互換性対応）
      let portfolioUrls: Array<{ url: string; description: string }> = [];
      if (user.portfolioUrls && user.portfolioUrls.length > 0) {
        if (typeof user.portfolioUrls[0] === 'string') {
          // 古い形式（文字列配列）
          portfolioUrls = (user.portfolioUrls as string[]).map(url => ({ url, description: '' }));
        } else {
          // 新しい形式（オブジェクト配列）
          portfolioUrls = (user.portfolioUrls as Array<{ url: string; description?: string }>).map(item => ({
            url: item.url,
            description: item.description || '',
          }));
        }
      }
      
      setEditForm({
        username: user.username,
        bio: user.bio || '',
        creatorType: user.creatorType,
        portfolioUrls: portfolioUrls,
      });
    }
    setError('');
  };

  const addPortfolioUrl = () => {
    if (editForm.portfolioUrls.length >= 3) {
      setError('作品URLは最大3つまで登録できます');
      return;
    }
    setEditForm({
      ...editForm,
      portfolioUrls: [...editForm.portfolioUrls, { url: '', description: '' }],
    });
  };

  const removePortfolioUrl = (index: number) => {
    setEditForm({
      ...editForm,
      portfolioUrls: editForm.portfolioUrls.filter((_, i) => i !== index),
    });
  };

  const updatePortfolioUrl = (index: number, field: 'url' | 'description', value: string) => {
    const newUrls = [...editForm.portfolioUrls];
    newUrls[index] = { ...newUrls[index], [field]: value || '' };
    setEditForm({
      ...editForm,
      portfolioUrls: newUrls,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // コンテンツフィルタリング
    const usernameError = validateContent(editForm.username);
    if (usernameError) {
      setError(usernameError);
      return;
    }

    // 文字数制限チェック
    if (editForm.bio.length > MAX_BIO_LENGTH) {
      setError(`自己紹介は${MAX_BIO_LENGTH}文字以内で入力してください（現在: ${editForm.bio.length}文字）`);
      return;
    }

    // URL説明の文字数チェック
    for (const urlItem of editForm.portfolioUrls) {
      if (urlItem.description && urlItem.description.length > MAX_URL_DESCRIPTION_LENGTH) {
        setError(`URL説明は${MAX_URL_DESCRIPTION_LENGTH}文字以内で入力してください（現在: ${urlItem.description.length}文字）`);
        return;
      }
    }

    // 作品URLの最大数チェック
    const validUrls = editForm.portfolioUrls.filter(item => item.url.trim().length > 0);
    if (validUrls.length > 3) {
      setError('作品URLは最大3つまで登録できます');
      return;
    }

    const bioError = editForm.bio ? validateContent(editForm.bio) : null;
    if (bioError) {
      setError(bioError);
      return;
    }

    setSubmitting(true);

    try {
      // URLのフィルタリング（空文字列を除外）
      const portfolioUrls = editForm.portfolioUrls
        .filter(item => item.url.trim().length > 0)
        .map(item => ({
          url: item.url.trim(),
          description: item.description.trim() || undefined,
        }));

      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: editForm.username,
          bio: editForm.bio,
          creatorType: editForm.creatorType,
          portfolioUrls: portfolioUrls.length > 0 ? portfolioUrls : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        // 利用停止エラーの場合、自動ログアウト
        if (res.status === 403 && data.error?.includes('利用停止')) {
          await fetch('/api/auth/logout', { method: 'POST' });
          alert('このアカウントは利用停止されています');
          router.push('/');
          return;
        }
        setError(data.error || 'プロフィールの更新に失敗しました');
        setSubmitting(false);
        return;
      }

      if (data.user) {
        // プロフィールページの状態を更新
        setUser(data.user);
        setEditing(false);
        
        // 投稿一覧を再取得（クリエイタータイプが変更された場合に反映される）
        await fetchUserPosts();
        
        // ナビゲーションバーに更新を通知（ユーザーデータを含める）
        // 少し遅延させて確実に発火させる
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('profileUpdated', { 
            detail: data.user 
          }));
        }, 100);
      }
      setSubmitting(false);
    } catch (err) {
      setError('プロフィールの更新に失敗しました');
      setSubmitting(false);
    }
  };


  const postTypeLabels: Record<PostType, string> = {
    collab: '🤝 コラボ募集',
    idea: '💡 アイデア共有',
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

  if (!user) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              プロフィールが見つかりません
            </h1>
            <Link
              href="/login"
              className="text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              ログイン
            </Link>
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
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 sm:p-8 mb-6">
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6">
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-2 break-words">
                  {user.username}
                </h1>
                <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
                  <span className="px-4 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300 rounded-full text-sm font-semibold">
                    {creatorTypeLabels[user.creatorType]}
                  </span>
                  {user.subscription && (
                    <span className={`px-4 py-1 rounded-full text-sm font-semibold ${
                      user.subscription.planType === 'free'
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                        : user.subscription.planType === 'grow'
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
                        : 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300'
                    }`}>
                      {user.subscription.planType === 'free' && '🟩 Free Plan'}
                      {user.subscription.planType === 'grow' && '🟦 Grow Plan'}
                      {user.subscription.planType === 'bloom' && '🟪 Bloom Plan'}
                      {user.subscription.status === 'active' && user.subscription.planType !== 'free' && ' ✓'}
                    </span>
                  )}
                  {user.publicId && (
                    <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                      <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                        <span className="hidden sm:inline">表示用ID:</span>
                        <span className="sm:hidden">ID:</span>
                      </span>
                      <span className="px-2 sm:px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 rounded-lg text-xs sm:text-sm font-mono font-semibold break-all">
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
                  <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                    登録日: {formatDate(user.createdAt)}
                  </span>
                </div>
              </div>
              {!editing && (
                <button
                  onClick={handleEdit}
                  className="px-3 sm:px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors whitespace-nowrap flex-shrink-0"
                >
                  編集
                </button>
              )}
            </div>

            {editing ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400">
                    {error}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    ユーザー名
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.username}
                    onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    クリエイタータイプ
                  </label>
                  <select
                    required
                    value={editForm.creatorType}
                    onChange={(e) => setEditForm({ ...editForm, creatorType: e.target.value as CreatorType })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  >
                    <option value="writer">小説家（Writer）</option>
                    <option value="illustrator">イラストレーター（Illustrator）</option>
                    <option value="mangaArtist">漫画家 / マンガ制作（Manga Artist）</option>
                    <option value="composer">作曲家 / ボカロP（Composer）</option>
                    <option value="singer">歌手 / 歌い手（Singer）</option>
                    <option value="voiceActor">声優 / ナレーター（Voice Actor）</option>
                    <option value="gameCreator">ゲームクリエイター（Game Creator）</option>
                    <option value="videoCreator">動画編集者 / アニメーター（Video Creator）</option>
                    <option value="artist3d">3Dモデラー（3D Artist）</option>
                    <option value="live2dModeler">Live2D モデラー（Live2D Modeler）</option>
                    <option value="developer">Webエンジニア / プログラマー（Developer）</option>
                    <option value="other">その他（Other）</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    自己紹介
                    <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                      ({editForm.bio.length}/{MAX_BIO_LENGTH}文字)
                    </span>
                  </label>
                  <textarea
                    maxLength={MAX_BIO_LENGTH}
                    value={editForm.bio}
                    onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    placeholder="自己紹介を入力してください"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    作品URL（任意、最大3つ）
                  </label>
                  <div className="space-y-4">
                    {editForm.portfolioUrls.map((urlItem, index) => (
                      <div key={index} className="space-y-2">
                        <input
                          type="text"
                          maxLength={MAX_URL_DESCRIPTION_LENGTH}
                          value={urlItem.description || ''}
                          onChange={(e) => updatePortfolioUrl(index, 'description', e.target.value || '')}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                          placeholder="URLの説明（例：ポートフォリオ、作品ページなど）"
                        />
                        {urlItem.description && (
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {urlItem.description.length}/{MAX_URL_DESCRIPTION_LENGTH}文字
                          </p>
                        )}
                        <div className="flex gap-2">
                          <input
                            type="url"
                            value={urlItem.url || ''}
                            onChange={(e) => updatePortfolioUrl(index, 'url', e.target.value || '')}
                            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                            placeholder="https://example.com/portfolio"
                          />
                          <button
                            type="button"
                            onClick={() => removePortfolioUrl(index)}
                            className="px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                            aria-label="削除"
                          >
                            <svg
                              className="w-5 h-5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                              />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                    {editForm.portfolioUrls.length < 3 && (
                      <button
                        type="button"
                        onClick={addPortfolioUrl}
                        className="w-full px-4 py-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-400 hover:border-indigo-500 dark:hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors flex items-center justify-center gap-2"
                      >
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 4v16m8-8H4"
                          />
                        </svg>
                        <span>URLを追加</span>
                      </button>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    作品集やポートフォリオサイトのURLを入力してください（最大3つ）
                  </p>
                </div>

                <div className="flex gap-4">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? '更新中...' : '保存'}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancel}
                    disabled={submitting}
                    className="px-6 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
                  >
                    キャンセル
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                {user.bio ? (
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      自己紹介
                    </h3>
                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                      {user.bio}
                    </p>
                  </div>
                ) : (
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      自己紹介
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400 italic">
                      自己紹介が設定されていません
                    </p>
                  </div>
                )}
                
                <div className="mt-4">
                  <Link
                    href="/bookmarks"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors"
                  >
                    <svg
                      className="w-5 h-5"
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
                    <span className="font-medium">ブックマーク</span>
                  </Link>
                </div>
                
                {user.portfolioUrls && user.portfolioUrls.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      作品リンク
                    </h3>
                    <div className="space-y-3">
                      {(() => {
                        // portfolioUrlsを正規化
                        let urlItems: Array<{ url: string; description?: string }> = [];
                        
                        if (typeof user.portfolioUrls[0] === 'string') {
                          // 古い形式（文字列配列）
                          urlItems = (user.portfolioUrls as string[]).map(url => ({ url }));
                        } else {
                          // 新しい形式（オブジェクト配列）
                          urlItems = (user.portfolioUrls as Array<{ url: string; description?: string }>);
                        }
                        
                        return urlItems.map((urlItem, index) => (
                          <div key={index} className="space-y-1">
                            {urlItem.description && (
                              <p className="text-sm text-gray-600 dark:text-gray-400 font-medium break-words overflow-wrap-anywhere">
                                {urlItem.description}
                              </p>
                            )}
                            <a
                              href={urlItem.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                            >
                              <svg
                                className="w-5 h-5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                                />
                              </svg>
                              <span className="font-medium">リンクを開く</span>
                            </a>
                          </div>
                        ));
                      })()}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* プラン情報とプランページへのリンク */}
          {user.subscription && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    現在のプラン
                  </h3>
                  <div className="flex items-center gap-3">
                    <span className={`px-4 py-2 rounded-lg text-sm font-semibold ${
                      user.subscription.planType === 'free'
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                        : user.subscription.planType === 'grow'
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
                        : 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300'
                    }`}>
                      {user.subscription.planType === 'free' && '🟩 Free Plan（無料）'}
                      {user.subscription.planType === 'grow' && '🟦 Grow Plan（成長プラン）'}
                      {user.subscription.planType === 'bloom' && '🟪 Bloom Plan（開花プラン）'}
                    </span>
                    {user.subscription.status === 'active' && user.subscription.planType !== 'free' && (
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        ✓ アクティブ
                      </span>
                    )}
                  </div>
                  {user.subscription.planType === 'free' && (
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                      プランをアップグレードして、より多くの機能を利用しましょう
                    </p>
                  )}
                </div>
                <Link
                  href="/pricing"
                  className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors text-center"
                >
                  {user.subscription.planType === 'free' ? 'プランを確認' : 'プランを管理'}
                </Link>
              </div>
            </div>
          )}

          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              投稿一覧 ({posts.length})
            </h2>

            {posts.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 text-center">
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  まだ投稿がありません
                </p>
                <Link
                  href="/posts/new"
                  className="inline-block px-6 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
                >
                  最初の投稿を作成
                </Link>
              </div>
            ) : (
              <div className="grid gap-6">
                {posts.map((post) => {
                  const bumpStatus = bumpStatuses[post.id];
                  return (
                    <div
                      key={post.id}
                      className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow"
                    >
                      <Link
                        href={`/posts/${post.id}`}
                        className="block"
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

                        {post.tags.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-4">
                            {post.tags.map((tag) => (
                              <span
                                key={tag}
                                className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded text-xs"
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}

                        <div className="flex justify-between items-center text-sm text-gray-500 dark:text-gray-400">
                          <span>
                            {post.bumpedAt ? (
                              <>
                                挙げ: {formatDate(post.bumpedAt)}
                              </>
                            ) : (
                              formatDate(post.createdAt)
                            )}
                          </span>
                          {post.updatedAt !== post.createdAt && (
                            <span className="text-xs">編集済み</span>
                          )}
                        </div>
                      </Link>
                      
                      {/* 挙げボタン */}
                      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            handleBump(post.id);
                          }}
                          disabled={!bumpStatus?.canBump}
                          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                            bumpStatus?.canBump
                              ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-200 dark:hover:bg-indigo-900/50'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                          }`}
                        >
                          <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 15l7-7 7 7"
                            />
                          </svg>
                          <span className="font-medium">
                            {bumpStatus?.canBump ? '⇧挙げ' : '挙げ済み'}
                          </span>
                        </button>
                        {!bumpStatus?.canBump && bumpStatus?.nextBumpAt && (
                          <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                            <p className="mb-1">この投稿は24時間に1回までしか挙げられません</p>
                            <p className="font-medium">
                              次回可能まで: 
                              {bumpStatus.hoursRemaining > 0 && ` ${bumpStatus.hoursRemaining}時間`}
                              {bumpStatus.minutesRemaining > 0 && ` ${bumpStatus.minutesRemaining}分`}
                              {bumpStatus.secondsRemaining > 0 && ` ${bumpStatus.secondsRemaining}秒`}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

