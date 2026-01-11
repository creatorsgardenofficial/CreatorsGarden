'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { Event, Comment, User } from '@/types';
import { validateContent } from '@/lib/contentFilter';
import { creatorTypeLabels } from '@/lib/creatorTypes';

const MAX_COMMENT_LENGTH = 500;

export default function EventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [event, setEvent] = useState<Event | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [commentContent, setCommentContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);
  const [bumping, setBumping] = useState(false);
  const [isLiked, setIsLiked] = useState(false);

  useEffect(() => {
    fetchEvent();
    fetchComments();
    fetchUser();
  }, [params.id]);

  const fetchEvent = async () => {
    try {
      const res = await fetch(`/api/events/${params.id}`);
      const data = await res.json();
      if (res.ok && data.event) {
        setEvent(data.event);
        if (user) {
          setIsLiked(data.event.likes.includes(user.id));
        }
      } else {
        router.push('/events');
      }
    } catch (error) {
      console.error('Failed to fetch event:', error);
      router.push('/events');
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = async () => {
    try {
      const res = await fetch(`/api/events/${params.id}/comments`);
      const data = await res.json();
      if (res.ok && data.comments) {
        setComments(data.comments);
      }
    } catch (error) {
      console.error('Failed to fetch comments:', error);
    }
  };

  const fetchUser = async () => {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      const data = await res.json();
      if (data.user) {
        setUser(data.user);
        if (event) {
          setIsLiked(event.likes.includes(data.user.id));
        }
      }
    } catch (error) {
      // エラーは静かに無視
    }
  };

  const handleLike = async () => {
    if (!user) {
      alert('ログインが必要です');
      return;
    }

    try {
      const res = await fetch(`/api/events/${params.id}/like`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      if (res.ok && data.event) {
        setEvent(data.event);
        setIsLiked(data.event.likes.includes(user.id));
      } else {
        alert(data.error || 'イイねに失敗しました');
      }
    } catch (error) {
      alert('イイねに失敗しました');
    }
  };

  const handleBump = async () => {
    if (!user || !event || user.id !== event.userId) {
      return;
    }

    setBumping(true);
    try {
      const res = await fetch(`/api/events/${params.id}/bump`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      if (res.ok && data.event) {
        setEvent(data.event);
        alert('イベントを挙げました');
      } else {
        if (res.status === 429) {
          alert(data.error || '24時間以内に既に挙げています');
        } else {
          alert(data.error || '挙げに失敗しました');
        }
      }
    } catch (error) {
      alert('挙げに失敗しました');
    } finally {
      setBumping(false);
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      alert('ログインが必要です');
      return;
    }

    if (!commentContent.trim()) {
      alert('コメントを入力してください');
      return;
    }

    if (commentContent.length > MAX_COMMENT_LENGTH) {
      alert(`コメントは${MAX_COMMENT_LENGTH}文字以内で入力してください`);
      return;
    }

    const contentError = validateContent(commentContent);
    if (contentError) {
      alert(contentError);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/events/${params.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ content: commentContent.trim() }),
      });

      const data = await res.json();
      if (res.ok && data.comment) {
        setComments([...comments, data.comment]);
        setCommentContent('');
      } else {
        alert(data.error || 'コメントの投稿に失敗しました');
      }
    } catch (error) {
      alert('コメントの投稿に失敗しました');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!user) return;

    try {
      const res = await fetch(`/api/events/${params.id}/comments/${commentId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (res.ok) {
        setComments(comments.filter(c => c.id !== commentId));
        setDeletingCommentId(null);
      } else {
        const data = await res.json();
        alert(data.error || 'コメントの削除に失敗しました');
      }
    } catch (error) {
      alert('コメントの削除に失敗しました');
    }
  };

  const handleDeleteEvent = async () => {
    if (!user || !event || user.id !== event.userId) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/events/${params.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (res.ok) {
        alert('イベントを削除しました');
        router.push('/events');
      } else {
        const data = await res.json();
        alert(data.error || 'イベントの削除に失敗しました');
      }
    } catch (error) {
      alert('イベントの削除に失敗しました');
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
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

  const isEventExpired = (endDate: string) => {
    return new Date(endDate) < new Date();
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

  if (!event) {
    return null;
  }

  const isExpired = isEventExpired(event.endDate);
  const canEdit = user && user.id === event.userId;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                {event.name}
              </h1>
              <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-4">
                <span>開始: {formatDate(event.startDate)}</span>
                <span>終了: {formatDate(event.endDate)}</span>
              </div>
              <span
                className={`inline-block px-3 py-1 rounded-full text-sm font-semibold mb-4 ${
                  event.status === 'open' && !isExpired
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                    : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                }`}
              >
                {event.status === 'open' && !isExpired ? 'open' : 'close'}
              </span>
            </div>
            {canEdit && (
              <div className="flex gap-2">
                <Link
                  href={`/events/${event.id}/edit`}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  編集
                </Link>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  削除
                </button>
                {user.id === event.userId && (
                  <button
                    onClick={handleBump}
                    disabled={bumping}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
                  >
                    {bumping ? '挙げ中...' : '挙げる'}
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="prose dark:prose-invert max-w-none mb-6">
            <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
              {event.content}
            </p>
          </div>

          {event.urls && event.urls.length > 0 && (
            <div className="mb-6 space-y-2">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">関連URL</h3>
              {event.urls.map((urlData, index) => (
                <a
                  key={index}
                  href={urlData.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  {urlData.description || urlData.url}
                </a>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-4">
              <button
                onClick={handleLike}
                className={`flex items-center gap-1 ${
                  isLiked
                    ? 'text-red-500'
                    : 'text-gray-500 dark:text-gray-400 hover:text-red-500'
                }`}
              >
                <svg className="w-5 h-5" fill={isLiked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                <span>{event.likes.length}</span>
              </button>
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              <Link
                href={`/users/${event.userId}`}
                className="hover:underline"
              >
                {event.username}
              </Link>
              <span className="ml-2">
                {creatorTypeLabels[event.creatorType]}
              </span>
            </div>
          </div>
        </div>

        {/* コメントセクション */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">コメント</h2>

          {user ? (
            <form onSubmit={handleSubmitComment} className="mb-6">
              <textarea
                value={commentContent}
                onChange={(e) => setCommentContent(e.target.value)}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white mb-2"
                placeholder="コメントを入力..."
                maxLength={MAX_COMMENT_LENGTH}
              />
              <div className="flex justify-between items-center">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {commentContent.length}/{MAX_COMMENT_LENGTH}文字
                </p>
                <button
                  type="submit"
                  disabled={submitting || !commentContent.trim()}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
                >
                  {submitting ? '投稿中...' : 'コメントを投稿'}
                </button>
              </div>
            </form>
          ) : (
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              コメントするには<Link href="/login" className="text-indigo-600 dark:text-indigo-400 hover:underline">ログイン</Link>が必要です
            </p>
          )}

          <div className="space-y-4">
            {comments.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                コメントがありません
              </p>
            ) : (
              comments.map((comment) => (
                <div
                  key={comment.id}
                  className="border-b border-gray-200 dark:border-gray-700 pb-4 last:border-b-0"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Link
                          href={`/users/${comment.userId}`}
                          className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                        >
                          {comment.username}
                        </Link>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(comment.createdAt).toLocaleString('ja-JP')}
                        </span>
                      </div>
                      <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                        {comment.content}
                      </p>
                    </div>
                    {user && user.id === comment.userId && (
                      <button
                        onClick={() => {
                          if (confirm('コメントを削除しますか？')) {
                            handleDeleteComment(comment.id);
                          }
                        }}
                        className="ml-4 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                      >
                        削除
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 削除確認ダイアログ */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 max-w-md mx-4">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                イベントを削除しますか？
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                この操作は取り消せません。
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleDeleteEvent}
                  disabled={deleting}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {deleting ? '削除中...' : '削除する'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

