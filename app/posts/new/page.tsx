'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { PostType, CreatorType, User } from '@/types';
import { validateContent } from '@/lib/contentFilter';
import { getPlanLimits } from '@/lib/planLimits';

export default function NewPostPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    type: 'collab' as PostType,
    title: '',
    content: '',
    tags: '',
    urls: [{ url: '', description: '' }] as Array<{ url: string; description: string }>, // 複数URL対応（最大3つ）、説明付き
  });
  const [error, setError] = useState('');
  const [tagLimit, setTagLimit] = useState(3);
  
  // 文字数制限
  const MAX_TITLE_LENGTH = 100;
  const MAX_CONTENT_LENGTH = 1000;
  const MAX_TAG_LENGTH = 30; // 各タグの最大文字数
  const MAX_TAG_TOTAL_LENGTH = 200; // タグ全体（カンマ区切り含む）の最大文字数
  const MAX_URL_DESCRIPTION_LENGTH = 100;

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.user) {
          setUser(data.user);
          // プランに応じたタグ制限を設定
          const planType = data.user.subscription?.planType || 'free';
          const limits = getPlanLimits(planType);
          setTagLimit(limits.maxTags);
        } else {
          router.push('/login');
        }
        setLoading(false);
      })
      .catch(() => {
        router.push('/login');
        setLoading(false);
      });
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // 文字数制限チェック
    if (formData.title.length > MAX_TITLE_LENGTH) {
      setError(`タイトルは${MAX_TITLE_LENGTH}文字以内で入力してください（現在: ${formData.title.length}文字）`);
      return;
    }

    if (formData.content.length > MAX_CONTENT_LENGTH) {
      setError(`内容は${MAX_CONTENT_LENGTH}文字以内で入力してください（現在: ${formData.content.length}文字）`);
      return;
    }

    if (formData.tags.length > MAX_TAG_TOTAL_LENGTH) {
      setError(`タグは合計${MAX_TAG_TOTAL_LENGTH}文字以内で入力してください（現在: ${formData.tags.length}文字）`);
      return;
    }

    // コンテンツフィルタリング
    const titleError = validateContent(formData.title);
    if (titleError) {
      setError(titleError);
      return;
    }

    const contentError = validateContent(formData.content);
    if (contentError) {
      setError(contentError);
      return;
    }

    const tags = formData.tags
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);

    // タグのフィルタリングと文字数チェック
    for (const tag of tags) {
      if (tag.length > MAX_TAG_LENGTH) {
        setError(`各タグは${MAX_TAG_LENGTH}文字以内で入力してください（「${tag}」は${tag.length}文字）`);
        return;
      }
      const tagError = validateContent(tag);
      if (tagError) {
        setError(tagError);
        return;
      }
    }

    // URL説明の文字数チェック
    for (const urlItem of formData.urls) {
      if (urlItem.description && urlItem.description.length > MAX_URL_DESCRIPTION_LENGTH) {
        setError(`URL説明は${MAX_URL_DESCRIPTION_LENGTH}文字以内で入力してください（現在: ${urlItem.description.length}文字）`);
        return;
      }
    }

    // プランによるタグ数の制限チェック
    if (user) {
      const planType = user.subscription?.planType || 'free';
      const limits = getPlanLimits(planType);
      if (tags.length > limits.maxTags) {
        setError(`タグは${limits.maxTags}個までです。現在のプラン: ${planType === 'free' ? 'Seed Plan' : planType === 'grow' ? 'Grow Plan' : 'Bloom Plan'}。プランをアップグレードするには、プランページをご覧ください。`);
        return;
      }
    }

    setSubmitting(true);

    // URLのフィルタリング（空文字列を除外）
    const urls = formData.urls
      .filter(item => item.url.trim().length > 0)
      .map(item => ({
        url: item.url.trim(),
        description: item.description.trim() || undefined,
      }));

    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: formData.type,
          title: formData.title,
          content: formData.content,
          tags,
          urls: urls.length > 0 ? urls : undefined,
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
        setError(data.error || '投稿の作成に失敗しました');
        setSubmitting(false);
        return;
      }

      router.push(`/posts/${data.post.id}`);
    } catch (err) {
      setError('投稿の作成に失敗しました');
      setSubmitting(false);
    }
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

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-8">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-8">
            新規投稿
          </h1>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
            {error && (
              <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  投稿タイプ
                </label>
                <select
                  required
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as PostType })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                >
                  <option value="collab">🤝 コラボ募集</option>
                  <option value="idea">💡 アイデア共有</option>
                  <option value="seeking">🔍 パートナー探し</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  タイトル
                  <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                    ({formData.title.length}/{MAX_TITLE_LENGTH}文字)
                  </span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={MAX_TITLE_LENGTH}
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  placeholder="投稿のタイトルを入力"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  内容
                  <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                    ({formData.content.length}/{MAX_CONTENT_LENGTH}文字)
                  </span>
                </label>
                <textarea
                  required
                  maxLength={MAX_CONTENT_LENGTH}
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  rows={10}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  placeholder="投稿の内容を詳しく記入してください"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  タグ（カンマ区切り）
                  <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                    ({formData.tags.length}/{MAX_TAG_TOTAL_LENGTH}文字、各タグ{MAX_TAG_LENGTH}文字以内)
                  </span>
                </label>
                <input
                  type="text"
                  maxLength={MAX_TAG_TOTAL_LENGTH}
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  placeholder="例: 小説, ファンタジー, コラボ"
                />
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  複数のタグをカンマで区切って入力してください（最大{tagLimit}個）
                  {tagLimit === 3 && (
                    <span className="ml-2 text-indigo-600 dark:text-indigo-400">
                      <a href="/pricing" className="underline hover:no-underline">
                        プランをアップグレードしてタグ数を増やす
                      </a>
                    </span>
                  )}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  URLリンク（任意、最大3つ）
                </label>
                <div className="space-y-4">
                  {formData.urls.map((urlItem, index) => (
                    <div key={index} className="space-y-2">
                      <div>
                        <input
                          type="text"
                          maxLength={MAX_URL_DESCRIPTION_LENGTH}
                          value={urlItem.description || ''}
                          onChange={(e) => {
                            const newUrls = [...formData.urls];
                            newUrls[index] = { ...newUrls[index], description: e.target.value || '' };
                            setFormData({ ...formData, urls: newUrls });
                          }}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                          placeholder="リンクの説明（例：ポートフォリオ、作品ページなど）"
                        />
                        {urlItem.description && (
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            {urlItem.description.length}/{MAX_URL_DESCRIPTION_LENGTH}文字
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="url"
                          value={urlItem.url || ''}
                          onChange={(e) => {
                            const newUrls = [...formData.urls];
                            newUrls[index] = { ...newUrls[index], url: e.target.value || '' };
                            setFormData({ ...formData, urls: newUrls });
                          }}
                          className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                          placeholder="https://example.com"
                        />
                        {formData.urls.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              const newUrls = formData.urls.filter((_, i) => i !== index);
                              setFormData({ ...formData, urls: newUrls });
                            }}
                            className="px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors font-semibold"
                            title="削除"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  {formData.urls.length < 3 && (
                    <button
                      type="button"
                      onClick={() => {
                        setFormData({ ...formData, urls: [...formData.urls, { url: '', description: '' }] });
                      }}
                      className="w-full px-4 py-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-400 hover:border-indigo-500 dark:hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors font-semibold flex items-center justify-center gap-2"
                    >
                      <span className="text-xl">+</span>
                      URLを追加
                    </button>
                  )}
                </div>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  関連する作品やプロフィールのURLを入力してください（最大3つ）
                </p>
              </div>

              <div className="flex gap-4">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? '投稿中...' : '投稿する'}
                </button>
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  キャンセル
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}

