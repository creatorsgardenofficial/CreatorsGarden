'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { Feedback, FeedbackSubject } from '@/types';

// 返信フォームコンポーネント
function FeedbackReplyForm({ feedbackId, onSend }: { feedbackId: string; onSend: (id: string, content: string) => Promise<void> }) {
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setSubmitting(true);
    try {
      await onSend(feedbackId, content);
      setContent('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={3}
        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white mb-2"
        placeholder="返信内容を入力..."
        disabled={submitting}
      />
      <button
        type="submit"
        disabled={submitting || !content.trim()}
        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {submitting ? '送信中...' : '返信を送信'}
      </button>
    </form>
  );
}

const subjectLabels: Record<FeedbackSubject, string> = {
  feature: '機能要望',
  bug: '不具合報告',
  improvement: '改善提案',
  other: 'その他',
};

export default function FeedbackPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [myFeedbacks, setMyFeedbacks] = useState<Feedback[]>([]);
  const [loadingFeedbacks, setLoadingFeedbacks] = useState(false);
  const [showMyFeedbacks, setShowMyFeedbacks] = useState(false);
  const [readReplyIds, setReadReplyIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchMyFeedbacks();
    // ローカルストレージから既読状態を読み込む
    const stored = localStorage.getItem('readReplyIds');
    if (stored) {
      try {
        const ids = JSON.parse(stored);
        setReadReplyIds(new Set(ids));
      } catch (e) {
        // エラーは無視
      }
    }
  }, []);

  useEffect(() => {
    // 既読状態をローカルストレージに保存
    if (readReplyIds.size > 0) {
      localStorage.setItem('readReplyIds', JSON.stringify(Array.from(readReplyIds)));
    }
  }, [readReplyIds]);

  const fetchMyFeedbacks = async () => {
    setLoadingFeedbacks(true);
    try {
      const res = await fetch('/api/feedback/my');
      const data = await res.json();

      if (res.ok) {
        setMyFeedbacks(data.feedbacks || []);
      }
    } catch (err) {
      // エラーは無視（ログインしていない場合など）
    } finally {
      setLoadingFeedbacks(false);
    }
  };

  const handleShowMyFeedbacks = () => {
    setShowMyFeedbacks(true);
    // 返信があるフィードバックを既読としてマーク
    const newReadIds = new Set(readReplyIds);
    myFeedbacks.forEach(f => {
      const hasReply = f.reply || (f.messages && f.messages.some(m => m.senderType === 'admin'));
      if (hasReply && !readReplyIds.has(f.id)) {
        newReadIds.add(f.id);
      }
    });
    setReadReplyIds(newReadIds);
    // 通知をリセットするためにイベントを発火
    window.dispatchEvent(new CustomEvent('feedbackViewed'));
  };

  const handleSendMessage = async (feedbackId: string, content: string) => {
    if (!content.trim()) {
      alert('メッセージ内容を入力してください');
      return;
    }

    try {
      const res = await fetch(`/api/feedback/${feedbackId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || 'メッセージの送信に失敗しました');
        return;
      }

      // フィードバック一覧を更新
      await fetchMyFeedbacks();
    } catch (err) {
      alert('メッセージの送信に失敗しました');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus('idle');

    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        setSubmitStatus('error');
        return;
      }

      setSubmitStatus('success');
      setFormData({
        name: '',
        email: '',
        subject: '',
        message: '',
      });
      // 自分のフィードバック一覧を更新
      await fetchMyFeedbacks();
      // 新しく送信したフィードバックに返信が来た場合の通知をリセットするため、既読状態を更新
      const feedbackRes = await fetch('/api/feedback/my');
      const feedbackData = await feedbackRes.json();
      if (feedbackRes.ok && feedbackData.feedbacks) {
        const newReadIds = new Set(readReplyIds);
        feedbackData.feedbacks.forEach((f: Feedback) => {
          if (f.reply && !readReplyIds.has(f.id)) {
            newReadIds.add(f.id);
          }
        });
        setReadReplyIds(newReadIds);
      }
    } catch (error) {
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
            <div className="mb-8">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                      ご意見箱
                    </h1>
                    {myFeedbacks.length > 0 && (
                      <button
                        onClick={() => {
                          if (showMyFeedbacks) {
                            setShowMyFeedbacks(false);
                          } else {
                            handleShowMyFeedbacks();
                          }
                        }}
                        className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors shadow-md hover:shadow-lg flex items-center gap-2"
                      >
                        {showMyFeedbacks ? 'フォームを表示' : '返信を確認'}
                        {myFeedbacks.filter(f => f.reply && !readReplyIds.has(f.id)).length > 0 && (
                          <span className="px-2 py-1 bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] text-center">
                            {myFeedbacks.filter(f => f.reply && !readReplyIds.has(f.id)).length}
                          </span>
                        )}
                      </button>
                    )}
                  </div>
                  <p className="text-gray-600 dark:text-gray-300">
                    ご意見・ご要望・不具合報告など、お気軽にお聞かせください。
                    いただいたご意見は今後の改善に活用させていただきます。
                  </p>
                </div>
              </div>
            </div>

            {submitStatus === 'success' && (
              <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <p className="text-green-800 dark:text-green-300">
                  ご意見をお送りいただき、ありがとうございました。
                  内容を確認させていただき、今後の改善に活用いたします。
                </p>
              </div>
            )}

            {submitStatus === 'error' && (
              <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-red-800 dark:text-red-300">
                  送信に失敗しました。しばらく時間をおいて再度お試しください。
                </p>
              </div>
            )}

            {/* 自分のフィードバック一覧 */}
            {showMyFeedbacks && (
              <div className="mb-8">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                  あなたのフィードバックと返信
                </h2>
                {loadingFeedbacks ? (
                  <div className="text-center py-8">
                    <p className="text-gray-600 dark:text-gray-400">読み込み中...</p>
                  </div>
                ) : myFeedbacks.length === 0 ? (
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-6 text-center">
                    <p className="text-gray-600 dark:text-gray-400">
                      まだフィードバックを送信していません
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {myFeedbacks.map((feedback) => (
                      <div
                        key={feedback.id}
                        className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700"
                      >
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <span className="px-3 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300 rounded-full text-sm font-medium">
                                {subjectLabels[feedback.subject] || feedback.subject}
                              </span>
                              <span className="text-sm text-gray-500 dark:text-gray-400">
                                {formatDate(feedback.createdAt)}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 mb-4">
                          <p className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
                            {feedback.message}
                          </p>
                        </div>

                        {/* メッセージのやり取り表示 */}
                        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                          <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                            メッセージのやり取り
                          </h4>
                          {(feedback.messages && feedback.messages.length > 0) || feedback.reply ? (
                            <div className="space-y-3 max-h-96 overflow-y-auto mb-4">
                              {/* メッセージ配列を優先表示（messagesがある場合はそれを使用） */}
                              {feedback.messages && feedback.messages.length > 0 ? (
                                // 重複を除去して表示
                                Array.from(
                                  new Map(
                                    feedback.messages.map(msg => [msg.id, msg])
                                  ).values()
                                ).map((msg, index) => (
                                  <div
                                    key={`${msg.id}-${index}`}
                                    className={`rounded-lg p-4 ${
                                      msg.senderType === 'admin'
                                        ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                                        : 'bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between mb-2">
                                      <span className={`text-xs font-semibold ${
                                        msg.senderType === 'admin'
                                          ? 'text-green-600 dark:text-green-400'
                                          : 'text-gray-600 dark:text-gray-400'
                                      }`}>
                                        {msg.senderType === 'admin' ? '管理者' : 'あなた'}
                                      </span>
                                      <span className="text-xs text-gray-500 dark:text-gray-400">
                                        {formatDate(msg.createdAt)}
                                      </span>
                                    </div>
                                    <p className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
                                      {msg.content}
                                    </p>
                                  </div>
                                ))
                              ) : (
                                /* 後方互換性：messagesがない場合のみreplyフィールドを表示 */
                                feedback.reply && (
                                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                                    <div className="flex items-center justify-between mb-2">
                                      <span className="text-xs font-semibold text-green-600 dark:text-green-400">
                                        管理者
                                      </span>
                                      <span className="text-xs text-gray-500 dark:text-gray-400">
                                        {feedback.repliedAt && formatDate(feedback.repliedAt)}
                                      </span>
                                    </div>
                                    <p className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
                                      {feedback.reply}
                                    </p>
                                  </div>
                                )
                              )}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                              まだ返信がありません
                            </p>
                          )}
                          {/* 返信フォーム */}
                          <FeedbackReplyForm
                            feedbackId={feedback.id}
                            onSend={handleSendMessage}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {!showMyFeedbacks && (
              <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  ニックネーム <span className="text-gray-500">(任意)</span>
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  placeholder="コラボ太郎"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  メールアドレス <span className="text-gray-500">(任意)</span>
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  placeholder="example@email.com"
                />
              </div>

              <div>
                <label htmlFor="subject" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  件名 <span className="text-red-500">*</span>
                </label>
                <select
                  id="subject"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                >
                  <option value="">選択してください</option>
                  <option value="feature">機能要望</option>
                  <option value="bug">不具合報告</option>
                  <option value="improvement">改善提案</option>
                  <option value="other">その他</option>
                </select>
              </div>

              <div>
                <label htmlFor="message" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  メッセージ <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  required
                  rows={8}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white resize-none"
                  placeholder="ご意見・ご要望の内容をご記入ください"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? '送信中...' : '送信する'}
              </button>
            </form>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

