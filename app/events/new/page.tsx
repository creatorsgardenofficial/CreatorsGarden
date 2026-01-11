'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { User } from '@/types';
import { validateContent } from '@/lib/contentFilter';

export default function NewEventPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    content: '',
    startDate: '',
    endDate: '',
    urls: [{ url: '', description: '' }] as Array<{ url: string; description: string }>,
  });
  const [error, setError] = useState('');

  const MAX_NAME_LENGTH = 100;
  const MAX_CONTENT_LENGTH = 1000;
  const MAX_URL_DESCRIPTION_LENGTH = 100;

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.user) {
          setUser(data.user);
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

    // バリデーション
    if (!formData.name.trim()) {
      setError('イベント名を入力してください');
      return;
    }

    if (!formData.content.trim()) {
      setError('イベント内容を入力してください');
      return;
    }

    if (!formData.startDate) {
      setError('開始日を選択してください');
      return;
    }

    if (!formData.endDate) {
      setError('終了日を選択してください');
      return;
    }

    // 日付のバリデーション
    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);
    if (start > end) {
      setError('開始日は終了日より前である必要があります');
      return;
    }

    // 文字数制限チェック
    if (formData.name.length > MAX_NAME_LENGTH) {
      setError(`イベント名は${MAX_NAME_LENGTH}文字以内で入力してください（現在: ${formData.name.length}文字）`);
      return;
    }

    if (formData.content.length > MAX_CONTENT_LENGTH) {
      setError(`内容は${MAX_CONTENT_LENGTH}文字以内で入力してください（現在: ${formData.content.length}文字）`);
      return;
    }

    // コンテンツフィルタリング
    const nameError = validateContent(formData.name);
    if (nameError) {
      setError(nameError);
      return;
    }

    const contentError = validateContent(formData.content);
    if (contentError) {
      setError(contentError);
      return;
    }

    // URL説明の文字数チェック
    for (const urlItem of formData.urls) {
      if (urlItem.description && urlItem.description.length > MAX_URL_DESCRIPTION_LENGTH) {
        setError(`URL説明は${MAX_URL_DESCRIPTION_LENGTH}文字以内で入力してください（現在: ${urlItem.description.length}文字）`);
        return;
      }
    }

    setSubmitting(true);

    // URLのフィルタリング（空文字列を除外、最大3つまで）
    const urls = formData.urls
      .filter(item => item.url.trim().length > 0)
      .slice(0, 3)
      .map(item => ({
        url: item.url.trim(),
        description: item.description.trim() || undefined,
      }));

    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: formData.name,
          content: formData.content,
          startDate: formData.startDate,
          endDate: formData.endDate,
          urls: urls.length > 0 ? urls : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'イベントの作成に失敗しました');
        setSubmitting(false);
        return;
      }

      router.push(`/events/${data.event.id}`);
    } catch (error) {
      console.error('Failed to create event:', error);
      setError('イベントの作成に失敗しました');
      setSubmitting(false);
    }
  };

  const addUrlField = () => {
    if (formData.urls.length < 3) {
      setFormData({
        ...formData,
        urls: [...formData.urls, { url: '', description: '' }],
      });
    }
  };

  const removeUrlField = (index: number) => {
    if (formData.urls.length > 1) {
      setFormData({
        ...formData,
        urls: formData.urls.filter((_, i) => i !== index),
      });
    }
  };

  const updateUrlField = (index: number, field: 'url' | 'description', value: string) => {
    const newUrls = [...formData.urls];
    newUrls[index] = { ...newUrls[index], [field]: value };
    setFormData({ ...formData, urls: newUrls });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center text-gray-500 dark:text-gray-400">読み込み中...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">イベントを投稿</h1>

        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-6">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              イベント名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              placeholder="例: 創作イベント2026"
              maxLength={MAX_NAME_LENGTH}
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {formData.name.length}/{MAX_NAME_LENGTH}文字
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              開始日 <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              required
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              終了日 <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              required
              value={formData.endDate}
              onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              min={formData.startDate}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              イベント内容 <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              rows={8}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              placeholder="イベントの詳細を入力してください..."
              maxLength={MAX_CONTENT_LENGTH}
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {formData.content.length}/{MAX_CONTENT_LENGTH}文字
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              URL（最大3つまで、任意）
            </label>
            {formData.urls.map((urlItem, index) => (
              <div key={index} className="mb-3 space-y-2">
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={urlItem.url}
                    onChange={(e) => updateUrlField(index, 'url', e.target.value)}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    placeholder="https://example.com"
                  />
                  {formData.urls.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeUrlField(index)}
                      className="px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                    >
                      削除
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  value={urlItem.description}
                  onChange={(e) => updateUrlField(index, 'description', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  placeholder="URLの説明（任意）"
                  maxLength={MAX_URL_DESCRIPTION_LENGTH}
                />
              </div>
            ))}
            {formData.urls.length < 3 && (
              <button
                type="button"
                onClick={addUrlField}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                URLを追加
              </button>
            )}
          </div>

          <div className="flex gap-4">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? '投稿中...' : 'イベントを投稿'}
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
  );
}

