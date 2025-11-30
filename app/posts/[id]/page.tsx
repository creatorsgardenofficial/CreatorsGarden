'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import DMChat from '@/components/DMChat';
import { Post, Comment, PostType, CreatorType, User } from '@/types';
import { validateContent } from '@/lib/contentFilter';
import { creatorTypeLabels } from '@/lib/creatorTypes';

// コメントの最大文字数
const MAX_COMMENT_LENGTH = 500;

export default function PostDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [commentContent, setCommentContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentContent, setEditingCommentContent] = useState('');
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);
  const [showCommentDeleteConfirm, setShowCommentDeleteConfirm] = useState(false);
  const [showDMChat, setShowDMChat] = useState(false);
  const [dmTargetUserId, setDmTargetUserId] = useState<string | null>(null);
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [bumpStatus, setBumpStatus] = useState<{
    canBump: boolean;
    nextBumpAt: string | null;
    hoursRemaining: number;
    minutesRemaining: number;
    secondsRemaining: number;
  } | null>(null);
  const [bumping, setBumping] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    fetchPost();
    fetchComments();
    fetchUser();
    fetchLikeStatus();
    fetchBumpStatus();
    fetchAdminStatus();
  }, [params.id]);

  // クールタイムのリアルタイム更新
  useEffect(() => {
    if (!bumpStatus?.nextBumpAt || bumpStatus.canBump) {
      return;
    }

    const interval = setInterval(() => {
      const nextBumpTime = new Date(bumpStatus.nextBumpAt!).getTime();
      const now = Date.now();
      const timeRemaining = nextBumpTime - now;

      if (timeRemaining <= 0) {
        // クールタイム終了
        setBumpStatus({
          canBump: true,
          nextBumpAt: null,
          hoursRemaining: 0,
          minutesRemaining: 0,
          secondsRemaining: 0,
        });
        clearInterval(interval);
      } else {
        // 残り時間を計算
        const hours = Math.floor(timeRemaining / (60 * 60 * 1000));
        const minutes = Math.floor((timeRemaining % (60 * 60 * 1000)) / (60 * 1000));
        const seconds = Math.floor((timeRemaining % (60 * 1000)) / 1000);

        setBumpStatus({
          ...bumpStatus,
          hoursRemaining: hours,
          minutesRemaining: minutes,
          secondsRemaining: seconds,
        });
      }
    }, 1000); // 1秒ごとに更新

    return () => clearInterval(interval);
  }, [bumpStatus?.nextBumpAt, bumpStatus?.canBump]);

  const fetchLikeStatus = async () => {
    try {
      const res = await fetch(`/api/posts/${params.id}/like`);
      const data = await res.json();
      if (res.ok) {
        setIsLiked(data.isLiked || false);
        setLikesCount(data.likesCount || 0);
      }
    } catch (error) {
      console.error('Failed to fetch like status:', error);
    }
  };

  const fetchBumpStatus = async () => {
    try {
      const res = await fetch(`/api/posts/${params.id}/bump`);
      const data = await res.json();
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

        setBumpStatus({
          canBump: data.canBump || false,
          nextBumpAt,
          hoursRemaining,
          minutesRemaining,
          secondsRemaining,
        });
      }
    } catch (error) {
      console.error('Failed to fetch bump status:', error);
    }
  };

  const handleBump = async () => {
    if (!user || !post || user.id !== post.userId) {
      return;
    }

    if (!bumpStatus?.canBump) {
      if (bumpStatus?.nextBumpAt) {
        const nextTime = new Date(bumpStatus.nextBumpAt);
        alert(`24時間に1回までしか挙げられません。次は${nextTime.toLocaleString('ja-JP', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}から可能です。`);
      }
      return;
    }

    setBumping(true);
    try {
      const res = await fetch(`/api/posts/${params.id}/bump`, {
        method: 'POST',
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 429 && data.nextBumpAt) {
          const nextTime = new Date(data.nextBumpAt);
          alert(`24時間に1回までしか挙げられません。次は${nextTime.toLocaleString('ja-JP', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}から可能です。`);
        } else {
          alert(data.error || '投稿の挙げに失敗しました');
        }
        setBumping(false);
        return;
      }

      alert('投稿を挙げました！投稿一覧の上位に表示されます。');
      fetchPost(); // 投稿情報を再取得
      fetchBumpStatus(); // クールタイム情報を更新
      setBumping(false);
    } catch (error) {
      alert('投稿の挙げに失敗しました');
      setBumping(false);
    }
  };

  const fetchPost = async () => {
    const res = await fetch(`/api/posts/${params.id}`);
    const data = await res.json();
    if (data.post) {
      setPost(data.post);
      setLikesCount(data.post.likes?.length || 0);
    }
    setLoading(false);
  };

  const fetchComments = async () => {
    const res = await fetch(`/api/posts/${params.id}/comments`);
    const data = await res.json();
    setComments(data.comments || []);
  };

  const fetchUser = async () => {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      if (res.ok && data.user) {
        setUser(data.user);
      }
      // 401エラー（未ログイン）は正常なケースなので、エラーをログに出力しない
    } catch (error) {
      // ネットワークエラーなどのみログに出力
      console.error('Failed to fetch user:', error);
    }
  };

  const fetchAdminStatus = async () => {
    try {
      const res = await fetch('/api/admin/check', { credentials: 'include' });
      const data = await res.json();
      setIsAdmin(data.isAdmin || false);
    } catch (error) {
      setIsAdmin(false);
    }
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      router.push('/login');
      return;
    }

    // 文字数制限チェック
    if (commentContent.length > MAX_COMMENT_LENGTH) {
      alert(`コメントは${MAX_COMMENT_LENGTH}文字以内で入力してください（現在: ${commentContent.length}文字）`);
      return;
    }

    // コンテンツフィルタリング
    const contentError = validateContent(commentContent);
    if (contentError) {
      alert(contentError);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/posts/${params.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: commentContent }),
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
        alert(data.error || 'コメントの投稿に失敗しました');
        setSubmitting(false);
        return;
      }

      setCommentContent('');
      fetchComments();
      setSubmitting(false);
    } catch (err) {
      alert('コメントの投稿に失敗しました');
      setSubmitting(false);
    }
  };

  const handleEditComment = (comment: Comment) => {
    setEditingCommentId(comment.id);
    setEditingCommentContent(comment.content);
  };

  const handleCancelEdit = () => {
    setEditingCommentId(null);
    setEditingCommentContent('');
  };

  const handleUpdateComment = async (commentId: string) => {
    if (!user) {
      router.push('/login');
      return;
    }

    // 文字数制限チェック
    if (editingCommentContent.length > MAX_COMMENT_LENGTH) {
      alert(`コメントは${MAX_COMMENT_LENGTH}文字以内で入力してください（現在: ${editingCommentContent.length}文字）`);
      return;
    }

    // コンテンツフィルタリング
    const contentError = validateContent(editingCommentContent);
    if (contentError) {
      alert(contentError);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/comments/${commentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editingCommentContent }),
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
        alert(data.error || 'コメントの更新に失敗しました');
        setSubmitting(false);
        return;
      }

      setEditingCommentId(null);
      setEditingCommentContent('');
      fetchComments();
      setSubmitting(false);
    } catch (err) {
      alert('コメントの更新に失敗しました');
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!user) {
      router.push('/login');
      return;
    }

    setDeleting(true);
    try {
      const res = await fetch(`/api/comments/${commentId}`, {
        method: 'DELETE',
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
        alert(data.error || 'コメントの削除に失敗しました');
        setDeleting(false);
        setShowCommentDeleteConfirm(false);
        setDeletingCommentId(null);
        return;
      }

      setShowCommentDeleteConfirm(false);
      setDeletingCommentId(null);
      fetchComments();
      setDeleting(false);
    } catch (err) {
      alert('コメントの削除に失敗しました');
      setDeleting(false);
      setShowCommentDeleteConfirm(false);
      setDeletingCommentId(null);
    }
  };

  const handleAdminDeleteComment = async (commentId: string) => {
    if (!isAdmin) {
      return;
    }

    setDeleting(true);
    try {
      const res = await fetch(`/api/comments/${commentId}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || 'コメントの削除に失敗しました');
        setDeleting(false);
        return;
      }

      alert('コメントを管理者により削除しました');
      fetchComments();
      setDeleting(false);
    } catch (err) {
      alert('コメントの削除に失敗しました');
      setDeleting(false);
    }
  };

  const handleDelete = async () => {
    if (!user || !post || user.id !== post.userId) {
      return;
    }

    setDeleting(true);
    try {
      const res = await fetch(`/api/posts/${params.id}`, {
        method: 'DELETE',
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
        alert(data.error || '投稿の削除に失敗しました');
        setDeleting(false);
        setShowDeleteConfirm(false);
        return;
      }

      alert('投稿を削除しました');
      router.push('/posts');
    } catch (err) {
      alert('投稿の削除に失敗しました');
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleAdminDeletePost = async () => {
    if (!isAdmin || !post) {
      return;
    }

    setDeleting(true);
    try {
      const res = await fetch(`/api/posts/${params.id}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || '投稿の削除に失敗しました');
        setDeleting(false);
        return;
      }

      alert('投稿を管理者により削除しました');
      fetchPost();
      fetchComments();
      setDeleting(false);
    } catch (err) {
      alert('投稿の削除に失敗しました');
      setDeleting(false);
    }
  };

  const isOwner = user && post && user.id === post.userId;

  const handleLike = async () => {
    try {
      const res = await fetch(`/api/posts/${params.id}/like`, {
        method: 'POST',
      });
      const data = await res.json();
      
      if (res.ok) {
        setIsLiked(data.isLiked);
        setLikesCount(data.likesCount);
        if (post) {
          setPost({ ...post, likes: data.post.likes });
        }
      }
    } catch (error) {
      console.error('Failed to toggle like:', error);
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
      hour: '2-digit',
      minute: '2-digit',
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

  if (!post) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              投稿が見つかりません
            </h1>
            <Link
              href="/posts"
              className="text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              投稿一覧に戻る
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
          <Link
            href="/posts"
            className="inline-flex items-center text-indigo-600 dark:text-indigo-400 hover:underline mb-6"
          >
            ← 投稿一覧に戻る
          </Link>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 mb-6">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-2">
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
              {(isOwner || isAdmin) && (
                <div className="flex gap-2">
                  {isOwner && (
                    <>
                      <Link
                        href={`/posts/${post.id}/edit`}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors"
                      >
                        編集
                      </Link>
                      <button
                        onClick={() => setShowDeleteConfirm(true)}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 transition-colors"
                      >
                        削除
                      </button>
                    </>
                  )}
                  {isAdmin && !isOwner && (
                    <button
                      onClick={() => {
                        if (confirm('この投稿を管理者として削除しますか？削除メッセージが表示されます。')) {
                          handleAdminDeletePost();
                        }
                      }}
                      className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-semibold hover:bg-orange-700 transition-colors"
                    >
                      管理者削除
                    </button>
                  )}
                </div>
              )}
            </div>

            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4 break-words overflow-wrap-anywhere">
              {post.title}
            </h1>

            {post.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-6">
                {post.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full text-sm"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            <div className="prose dark:prose-invert max-w-none mb-6">
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words overflow-wrap-anywhere">
                {post.content}
              </p>
            </div>

            {((post.urls && post.urls.length > 0) || post.url) && (
              <div className="mb-6 space-y-3">
                {/* 複数URL対応（urls配列を優先、なければ後方互換性のためurlを使用） */}
                {(() => {
                  // URLデータを正規化
                  let urlItems: Array<{ url: string; description?: string }> = [];
                  
                  if (post.urls && post.urls.length > 0) {
                    // オブジェクト配列か文字列配列かを判定
                    if (typeof post.urls[0] === 'object' && post.urls[0] !== null) {
                      // 新しい形式（オブジェクト配列）
                      urlItems = post.urls as Array<{ url: string; description?: string }>;
                    } else {
                      // 古い形式（文字列配列）
                      urlItems = (post.urls as string[]).map(url => ({ url }));
                    }
                  } else if (post.url) {
                    // 後方互換性: 単一のurlフィールド
                    urlItems = [{ url: post.url }];
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
            )}

            {/* いいねボタン */}
            <div className="mb-6">
              <button
                onClick={handleLike}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  isLiked
                    ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                <svg
                  className="w-6 h-6"
                  fill={isLiked ? 'currentColor' : 'none'}
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                  />
                </svg>
                <span className="font-medium">
                  {isLiked ? 'いいね済み' : 'いいね'}
                </span>
                {likesCount > 0 && (
                  <span className="text-sm">({likesCount})</span>
                )}
              </button>
            </div>

            {/* 挙げボタン（投稿者のみ表示） */}
            {isOwner && (
              <div className="mb-6">
                <button
                  onClick={handleBump}
                  disabled={!bumpStatus?.canBump || bumping}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    bumpStatus?.canBump && !bumping
                      ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-200 dark:hover:bg-indigo-900/50'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                  }`}
                >
                  <svg
                    className="w-6 h-6"
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
                    {bumping ? '挙げ中...' : bumpStatus?.canBump ? '⇧挙げ' : '挙げ済み'}
                  </span>
                </button>
                {!bumpStatus?.canBump && bumpStatus?.nextBumpAt && (
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    次は
                    {bumpStatus.hoursRemaining > 0 && `${bumpStatus.hoursRemaining}時間`}
                    {bumpStatus.minutesRemaining > 0 && `${bumpStatus.minutesRemaining}分`}
                    {bumpStatus.secondsRemaining > 0 && `${bumpStatus.secondsRemaining}秒`}
                    後から可能です
                  </p>
                )}
              </div>
            )}

            <div className="flex justify-between items-center pt-6 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  投稿者:{' '}
                  <span
                    onClick={() => router.push(`/users/${post.userId}`)}
                    className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                  >
                    {post.username}
                  </span>
                  {' '}
                  <span className="inline-block px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full">
                    {creatorTypeLabels[post.creatorType]}
                  </span>
                </span>
                {user && user.id !== post.userId && (
                  <button
                    onClick={() => {
                      setDmTargetUserId(post.userId);
                      setShowDMChat(true);
                    }}
                    className="px-3 py-1 text-sm bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors flex items-center gap-1"
                    title="投稿者にDMを送る"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    DMを送る
                  </button>
                )}
              </div>
              <div className="flex items-center gap-4">
                {post.updatedAt !== post.createdAt && (
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    編集: {formatDate(post.updatedAt)}
                  </span>
                )}
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {formatDate(post.createdAt)}
                </span>
              </div>
            </div>
          </div>

          {showDeleteConfirm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 max-w-md mx-4">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                  投稿を削除しますか？
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  この操作は取り消せません。投稿とすべてのコメントが削除されます。
                </p>
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={deleting}
                    className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
                  >
                    キャンセル
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {deleting ? '削除中...' : '削除する'}
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              コメント ({comments.length})
            </h2>

            {user ? (
              <form onSubmit={handleCommentSubmit} className="mb-6">
                <div className="mb-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    コメント
                    <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                      ({commentContent.length}/{MAX_COMMENT_LENGTH}文字)
                    </span>
                  </label>
                  <textarea
                    required
                    maxLength={MAX_COMMENT_LENGTH}
                    value={commentContent}
                    onChange={(e) => setCommentContent(e.target.value)}
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white mb-3"
                    placeholder="コメントを入力..."
                  />
                </div>
                <button
                  type="submit"
                  disabled={submitting || commentContent.trim().length === 0}
                  className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? '投稿中...' : 'コメントを投稿'}
                </button>
              </form>
            ) : (
              <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <p className="text-gray-600 dark:text-gray-400 mb-2">
                  コメントを投稿するには
                  <Link href="/login" className="text-indigo-600 dark:text-indigo-400 hover:underline mx-1">
                    ログイン
                  </Link>
                  が必要です
                </p>
              </div>
            )}

            <div className="space-y-4">
              {comments.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                  コメントはまだありません
                </p>
              ) : (
                comments.map((comment) => {
                  const isCommentOwner = user && user.id === comment.userId;
                  const isEditing = editingCommentId === comment.id;

                  return (
                    <div
                      key={comment.id}
                      className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <Link
                          href={`/users/${comment.userId}`}
                          className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                        >
                          {comment.username}
                        </Link>
                        <div className="flex items-center gap-3">
                          {user && !isCommentOwner && !isEditing && (
                            <button
                              onClick={() => {
                                setDmTargetUserId(comment.userId);
                                setShowDMChat(true);
                              }}
                              className="px-3 py-1 text-sm bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors flex items-center gap-1"
                              title="DMを送る"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                              </svg>
                              DM
                            </button>
                          )}
                          {(isCommentOwner || isAdmin) && !isEditing && (
                            <div className="flex gap-2">
                              {isCommentOwner && (
                                <>
                                  <button
                                    onClick={() => handleEditComment(comment)}
                                    className="px-3 py-1 text-sm bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition-colors"
                                  >
                                    編集
                                  </button>
                                  <button
                                    onClick={() => {
                                      setDeletingCommentId(comment.id);
                                      setShowCommentDeleteConfirm(true);
                                    }}
                                    className="px-3 py-1 text-sm bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                                  >
                                    削除
                                  </button>
                                </>
                              )}
                              {isAdmin && !isCommentOwner && (
                                <button
                                  onClick={() => {
                                    if (confirm('このコメントを管理者として削除しますか？削除メッセージが表示されます。')) {
                                      handleAdminDeleteComment(comment.id);
                                    }
                                  }}
                                  className="px-3 py-1 text-sm bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded hover:bg-orange-200 dark:hover:bg-orange-900/50 transition-colors"
                                >
                                  管理者削除
                                </button>
                              )}
                            </div>
                          )}
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            {formatDate(comment.createdAt)}
                          </span>
                        </div>
                      </div>
                      {isEditing ? (
                        <div className="space-y-2">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                ({editingCommentContent.length}/{MAX_COMMENT_LENGTH}文字)
                              </span>
                            </label>
                            <textarea
                              maxLength={MAX_COMMENT_LENGTH}
                              value={editingCommentContent}
                              onChange={(e) => setEditingCommentContent(e.target.value)}
                              rows={4}
                              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-600 dark:text-white"
                            />
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleUpdateComment(comment.id)}
                              disabled={submitting || editingCommentContent.trim().length === 0}
                              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {submitting ? '更新中...' : '更新'}
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              disabled={submitting}
                              className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-semibold hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors disabled:opacity-50"
                            >
                              キャンセル
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words overflow-wrap-anywhere">
                          {comment.content}
                        </p>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {showCommentDeleteConfirm && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 max-w-md mx-4">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                    コメントを削除しますか？
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">
                    この操作は取り消せません。
                  </p>
                  <div className="flex gap-3 justify-end">
                    <button
                      onClick={() => {
                        setShowCommentDeleteConfirm(false);
                        setDeletingCommentId(null);
                      }}
                      disabled={deleting}
                      className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
                    >
                      キャンセル
                    </button>
                    <button
                      onClick={() => deletingCommentId && handleDeleteComment(deletingCommentId)}
                      disabled={deleting}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {deleting ? '削除中...' : '削除する'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      {showDMChat && user && (
        <DMChat
          currentUserId={user.id}
          initialUserId={dmTargetUserId || undefined}
          onClose={() => {
            setShowDMChat(false);
            setDmTargetUserId(null);
          }}
        />
      )}
    </>
  );
}

