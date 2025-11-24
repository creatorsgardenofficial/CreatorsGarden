'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { Feedback, User, CreatorType, Announcement } from '@/types';
import { creatorTypeLabels } from '@/lib/creatorTypes';

const subjectLabels: Record<string, string> = {
  feature: '機能要望',
  bug: '不具合報告',
  improvement: '改善提案',
  other: 'その他',
};


type TabType = 'feedback' | 'users' | 'security' | 'announcements';

export default function AdminPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('feedback');
  const [securityLogs, setSecurityLogs] = useState<any[]>([]);
  const [loadingSecurityLogs, setLoadingSecurityLogs] = useState(false);
  const [anomalies, setAnomalies] = useState<any>(null);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [passwordForm, setPasswordForm] = useState({ userId: '', password: '' });
  const [passwordError, setPasswordError] = useState('');
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [announcementForm, setAnnouncementForm] = useState({
    title: '',
    content: '',
    type: 'info' as 'emergency' | 'maintenance' | 'info' | 'warning' | 'success',
    isVisible: true,
    publishedAt: '',
    expiresAt: '',
  });
  const [submittingAnnouncement, setSubmittingAnnouncement] = useState(false);

  const fetchSecurityLogs = async () => {
    setLoadingSecurityLogs(true);
    try {
      const res = await fetch('/api/admin/security-logs?limit=100');
      const data = await res.json();
      if (res.ok) {
        setSecurityLogs(data.logs || []);
        setAnomalies(data.anomalies || null);
      }
    } catch (err) {
      console.error('Failed to fetch security logs:', err);
    } finally {
      setLoadingSecurityLogs(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'feedback') {
      fetchFeedbacks();
    } else if (activeTab === 'users') {
      fetchUsers();
    } else if (activeTab === 'security') {
      fetchSecurityLogs();
    } else if (activeTab === 'announcements') {
      fetchAnnouncements();
    }
  }, [activeTab]);

  const fetchFeedbacks = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/feedback');
      const data = await res.json();

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          setError('管理者権限が必要です');
          setTimeout(() => {
            router.push('/');
          }, 2000);
        } else {
          setError(data.error || 'フィードバックの取得に失敗しました');
        }
        setLoading(false);
        return;
      }

      const feedbacks = data.feedbacks || [];
      setFeedbacks(feedbacks);
      
      // フィードバック一覧を取得したら、確認済みのタイムスタンプを更新
      // この時点で表示されているすべてのフィードバックとメッセージを確認済みとしてマーク
      const now = new Date().toISOString();
      localStorage.setItem('adminFeedbackLastViewed', now);
      
      // 各フィードバックの最後のメッセージIDを記録（確認済みとしてマーク）
      const viewedFeedbackData: Record<string, { lastMessageId?: string; messageCount: number }> = {};
      feedbacks.forEach((f: { id: string; messages?: Array<{ id: string }> }) => {
        if (f.messages && f.messages.length > 0) {
          const lastMessage = f.messages[f.messages.length - 1];
          viewedFeedbackData[f.id] = {
            lastMessageId: lastMessage.id,
            messageCount: f.messages.length,
          };
        } else {
          viewedFeedbackData[f.id] = {
            messageCount: 0,
          };
        }
      });
      localStorage.setItem('adminViewedFeedbacks', JSON.stringify(viewedFeedbackData));
      
      // 通知をリセットするためにイベントを発火
      window.dispatchEvent(new CustomEvent('feedbackViewed'));
    } catch (err) {
      setError('フィードバックの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/users');
      const data = await res.json();

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          setError('管理者権限が必要です');
          setTimeout(() => {
            router.push('/');
          }, 2000);
        } else {
          setError(data.error || 'ユーザー一覧の取得に失敗しました');
        }
        setLoading(false);
        return;
      }

      setUsers(data.users || []);
    } catch (err) {
      setError('ユーザー一覧の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('このフィードバックを削除しますか？')) {
      return;
    }

    setDeletingId(id);
    try {
      const res = await fetch('/api/admin/feedback', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || '削除に失敗しました');
        return;
      }

      setFeedbacks(feedbacks.filter(f => f.id !== id));
    } catch (err) {
      alert('削除に失敗しました');
    } finally {
      setDeletingId(null);
    }
  };

  const handleReply = async (feedbackId: string) => {
    // 返信を送信する関数
    if (!replyContent.trim()) {
      alert('返信内容を入力してください');
      return;
    }

    setSubmittingReply(true);
    try {
      const res = await fetch(`/api/feedback/${feedbackId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: replyContent }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || '返信の送信に失敗しました');
        setSubmittingReply(false);
        return;
      }

      // フィードバック一覧を更新
      await fetchFeedbacks();
      setReplyingToId(null);
      setReplyContent('');
    } catch (err) {
      alert('返信の送信に失敗しました');
    } finally {
      setSubmittingReply(false);
    }
  };

  const handleDeleteReply = async (feedbackId: string) => {
    if (!confirm('返信を削除しますか？')) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/feedback/${feedbackId}/reply`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || '返信の削除に失敗しました');
        return;
      }

      // フィードバック一覧を更新
      await fetchFeedbacks();
      alert('返信を削除しました');
    } catch (err) {
      alert('返信の削除に失敗しました');
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');

    if (!passwordForm.password) {
      setPasswordError('パスワードを入力してください');
      return;
    }

    try {
      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUserId: passwordForm.userId,
          password: passwordForm.password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setPasswordError(data.error || 'パスワードの変更に失敗しました');
        return;
      }

      alert('パスワードを変更しました');
      setEditingUserId(null);
      setPasswordForm({ userId: '', password: '' });
      fetchUsers();
    } catch (err) {
      setPasswordError('パスワードの変更に失敗しました');
    }
  };

  const handleToggleActive = async (userId: string, currentStatus: boolean) => {
    const action = currentStatus ? '利用停止' : '有効化';
    if (!confirm(`このユーザーを${action}しますか？`)) {
      return;
    }

    try {
      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUserId: userId,
          isActive: !currentStatus,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || `${action}に失敗しました`);
        return;
      }

      fetchUsers();
    } catch (err) {
      alert(`${action}に失敗しました`);
    }
  };

  // お知らせ管理
  const fetchAnnouncements = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/announcements');
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'お知らせの取得に失敗しました');
        setLoading(false);
        return;
      }

      setAnnouncements(data.announcements || []);
    } catch (err) {
      setError('お知らせの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAnnouncement = async () => {
    if (!announcementForm.title || !announcementForm.content) {
      alert('タイトルと内容は必須です');
      return;
    }

    setSubmittingAnnouncement(true);
    try {
      const res = await fetch('/api/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: announcementForm.title,
          content: announcementForm.content,
          type: announcementForm.type,
          isVisible: announcementForm.isVisible,
          publishedAt: announcementForm.publishedAt || null,
          expiresAt: announcementForm.expiresAt || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || 'お知らせの作成に失敗しました');
        setSubmittingAnnouncement(false);
        return;
      }

      await fetchAnnouncements();
      setAnnouncementForm({
        title: '',
        content: '',
        type: 'info',
        isVisible: true,
        publishedAt: '',
        expiresAt: '',
      });
      setEditingAnnouncement(null);
    } catch (err) {
      alert('お知らせの作成に失敗しました');
    } finally {
      setSubmittingAnnouncement(false);
    }
  };

  const handleUpdateAnnouncement = async () => {
    if (!editingAnnouncement || !announcementForm.title || !announcementForm.content) {
      alert('タイトルと内容は必須です');
      return;
    }

    setSubmittingAnnouncement(true);
    try {
      const res = await fetch('/api/announcements', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingAnnouncement.id,
          title: announcementForm.title,
          content: announcementForm.content,
          type: announcementForm.type,
          isVisible: announcementForm.isVisible,
          publishedAt: announcementForm.publishedAt || null,
          expiresAt: announcementForm.expiresAt || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || 'お知らせの更新に失敗しました');
        setSubmittingAnnouncement(false);
        return;
      }

      await fetchAnnouncements();
      setAnnouncementForm({
        title: '',
        content: '',
        type: 'info',
        isVisible: true,
        publishedAt: '',
        expiresAt: '',
      });
      setEditingAnnouncement(null);
    } catch (err) {
      alert('お知らせの更新に失敗しました');
    } finally {
      setSubmittingAnnouncement(false);
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    if (!confirm('お知らせを削除しますか？')) {
      return;
    }

    try {
      const res = await fetch(`/api/announcements?id=${id}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || 'お知らせの削除に失敗しました');
        return;
      }

      await fetchAnnouncements();
    } catch (err) {
      alert('お知らせの削除に失敗しました');
    }
  };

  const handleEditAnnouncement = (announcement: Announcement) => {
    setEditingAnnouncement(announcement);
      setAnnouncementForm({
        title: announcement.title,
        content: announcement.content,
        type: announcement.type || 'info',
        isVisible: announcement.isVisible,
        publishedAt: announcement.publishedAt ? announcement.publishedAt.split('T')[0] + 'T' + announcement.publishedAt.split('T')[1].split('.')[0] : '',
        expiresAt: announcement.expiresAt ? announcement.expiresAt.split('T')[0] + 'T' + announcement.expiresAt.split('T')[1].split('.')[0] : '',
      });
  };

  const handleCancelEdit = () => {
    setEditingAnnouncement(null);
    setAnnouncementForm({
      title: '',
      content: '',
      type: 'info',
      isVisible: true,
      publishedAt: '',
      expiresAt: '',
    });
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

  if (loading && activeTab === 'feedback' && feedbacks.length === 0) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <div className="flex justify-center items-center h-64">
              <div className="w-8 h-8 border-2 border-gray-300 border-t-indigo-600 rounded-full animate-spin"></div>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (error && (activeTab === 'feedback' ? feedbacks.length === 0 : users.length === 0)) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
              <p className="text-red-800 dark:text-red-300">{error}</p>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              管理者ページ
            </h1>
          </div>

          {/* タブ */}
          <div className="flex gap-4 mb-8 border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setActiveTab('feedback')}
              className={`px-6 py-3 font-semibold transition-colors ${
                activeTab === 'feedback'
                  ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              フィードバック
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`px-6 py-3 font-semibold transition-colors ${
                activeTab === 'users'
                  ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              ユーザー管理
            </button>
            <button
              onClick={() => setActiveTab('security')}
              className={`px-6 py-3 font-semibold transition-colors ${
                activeTab === 'security'
                  ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              セキュリティログ
            </button>
            <button
              onClick={() => setActiveTab('announcements')}
              className={`px-6 py-3 font-semibold transition-colors ${
                activeTab === 'announcements'
                  ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              お知らせ管理
            </button>
          </div>

          {/* フィードバックタブ */}
          {activeTab === 'feedback' && (
            <>
              {feedbacks.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 text-center">
                  <p className="text-gray-600 dark:text-gray-300">
                    フィードバックはまだありません
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {feedbacks.map((feedback) => (
                    <div
                      key={feedback.id}
                      className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6"
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
                          {(feedback.name || feedback.email) && (
                            <div className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                              {feedback.name && (
                                <span className="mr-4">ニックネーム: {feedback.name}</span>
                              )}
                              {feedback.email && (
                                <span>メール: {feedback.email}</span>
                              )}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => handleDelete(feedback.id)}
                          disabled={deletingId === feedback.id}
                          className="px-4 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {deletingId === feedback.id ? '削除中...' : '削除'}
                        </button>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 mb-4">
                        <p className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
                          {feedback.message}
                        </p>
                      </div>

                      {/* メッセージのやり取り表示 */}
                      {(feedback.messages && feedback.messages.length > 0) || feedback.reply ? (
                        <div className="mb-4 space-y-3">
                          <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                            メッセージのやり取り
                          </h4>
                          <div className="space-y-3 max-h-96 overflow-y-auto">
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
                                      ? 'bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800'
                                      : 'bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600'
                                  }`}
                                >
                                  <div className="flex items-center justify-between mb-2">
                                    <span className={`text-xs font-semibold ${
                                      msg.senderType === 'admin'
                                        ? 'text-indigo-600 dark:text-indigo-400'
                                        : 'text-gray-600 dark:text-gray-400'
                                    }`}>
                                      {msg.senderType === 'admin' ? '管理者' : 'ユーザー'}
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
                                <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-4">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
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
                        </div>
                      ) : null}

                      {/* 返信フォーム */}
                      {replyingToId === feedback.id ? (
                        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                          <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                            メッセージを送信
                          </h4>
                          <textarea
                            value={replyContent}
                            onChange={(e) => setReplyContent(e.target.value)}
                            rows={4}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white mb-2"
                            placeholder="メッセージ内容を入力..."
                            disabled={submittingReply}
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleReply(feedback.id)}
                              disabled={submittingReply || !replyContent.trim()}
                              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {submittingReply ? '送信中...' : '送信'}
                            </button>
                            <button
                              onClick={() => {
                                setReplyingToId(null);
                                setReplyContent('');
                              }}
                              disabled={submittingReply}
                              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
                            >
                              キャンセル
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setReplyingToId(feedback.id)}
                          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                        >
                          返信する
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* ユーザー管理タブ */}
          {activeTab === 'users' && (
            <>
              {loading && users.length === 0 ? (
                <div className="flex justify-center items-center h-64">
                  <div className="w-8 h-8 border-2 border-gray-300 border-t-indigo-600 rounded-full animate-spin"></div>
                </div>
              ) : users.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 text-center">
                  <p className="text-gray-600 dark:text-gray-300">
                    ユーザーが登録されていません
                  </p>
                </div>
              ) : (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            ユーザー名
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            メールアドレス
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            クリエイタータイプ
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            ステータス
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            登録日
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            操作
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {users.map((user) => (
                          <tr key={user.id} className={user.isActive === false ? 'opacity-50' : ''}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                              {user.username}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                              {user.email}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                              {creatorTypeLabels[user.creatorType]}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex flex-col gap-1">
                                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                  user.isActive !== false
                                    ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                                    : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                                }`}>
                                  {user.isActive !== false ? '有効' : '停止中'}
                                </span>
                                {user.accountLockedUntil && new Date(user.accountLockedUntil) > new Date() && (
                                  <span className="px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300">
                                    ロック中
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                              {formatDate(user.createdAt)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <div className="flex flex-col gap-2">
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => {
                                      setEditingUserId(user.id);
                                      setPasswordForm({ userId: user.id, password: '' });
                                      setPasswordError('');
                                    }}
                                    className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300"
                                  >
                                    パスワード変更
                                  </button>
                                  <button
                                    onClick={() => handleToggleActive(user.id, user.isActive !== false)}
                                    className={`${
                                      user.isActive !== false
                                        ? 'text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300'
                                        : 'text-green-600 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300'
                                    }`}
                                  >
                                    {user.isActive !== false ? '利用停止' : '有効化'}
                                  </button>
                                </div>
                                {user.accountLockedUntil && new Date(user.accountLockedUntil) > new Date() && (
                                  <button
                                    onClick={async () => {
                                      if (!confirm(`ユーザー「${user.username}」のアカウントロックを解除しますか？`)) {
                                        return;
                                      }
                                      try {
                                        const res = await fetch(`/api/admin/users/${user.id}/unlock`, {
                                          method: 'POST',
                                          credentials: 'include',
                                        });
                                        const data = await res.json();
                                        if (res.ok) {
                                          // ユーザー一覧を再取得
                                          await fetchUsers();
                                          alert('アカウントロックを解除しました');
                                        } else {
                                          alert(data.error || 'アカウントロック解除に失敗しました');
                                        }
                                      } catch (err) {
                                        alert('アカウントロック解除に失敗しました');
                                      }
                                    }}
                                    className="text-orange-600 dark:text-orange-400 hover:text-orange-900 dark:hover:text-orange-300"
                                  >
                                    ロック解除
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* パスワード変更モーダル */}
              {editingUserId && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 max-w-md w-full mx-4">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                      パスワード変更
                    </h2>
                    <form onSubmit={handlePasswordChange}>
                      {passwordError && (
                        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm">
                          {passwordError}
                        </div>
                      )}
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          新しいパスワード
                        </label>
                        <input
                          type="password"
                          required
                          value={passwordForm.password}
                          onChange={(e) => setPasswordForm({ ...passwordForm, password: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                          placeholder="小文字アルファベットと数字を組み合わせて8文字以上"
                        />
                      </div>
                      <div className="flex gap-4">
                        <button
                          type="submit"
                          className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
                        >
                          変更
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingUserId(null);
                            setPasswordForm({ userId: '', password: '' });
                            setPasswordError('');
                          }}
                          className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                        >
                          キャンセル
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </>
          )}

          {activeTab === 'security' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                セキュリティログ
              </h2>

              {/* 異常検知サマリー */}
              {anomalies && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6">
                  <h3 className="text-lg font-semibold text-yellow-800 dark:text-yellow-300 mb-3">
                    過去24時間の異常検知
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <div className="text-sm text-yellow-700 dark:text-yellow-400">疑わしいログイン試行</div>
                      <div className="text-2xl font-bold text-yellow-800 dark:text-yellow-300">
                        {anomalies.suspiciousLogins}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-yellow-700 dark:text-yellow-400">レート制限違反</div>
                      <div className="text-2xl font-bold text-yellow-800 dark:text-yellow-300">
                        {anomalies.rateLimitViolations}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-yellow-700 dark:text-yellow-400">CSRF失敗</div>
                      <div className="text-2xl font-bold text-yellow-800 dark:text-yellow-300">
                        {anomalies.csrfFailures}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-yellow-700 dark:text-yellow-400">不正アクセス試行</div>
                      <div className="text-2xl font-bold text-yellow-800 dark:text-yellow-300">
                        {anomalies.unauthorizedAccess}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ログ一覧 */}
              {loadingSecurityLogs ? (
                <div className="text-center py-12">
                  <div className="inline-block w-8 h-8 border-4 border-gray-300 border-t-indigo-600 rounded-full animate-spin"></div>
                </div>
              ) : securityLogs.length === 0 ? (
                <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl shadow-lg">
                  <p className="text-gray-600 dark:text-gray-400">セキュリティログがありません</p>
                </div>
              ) : (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            日時
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            種類
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            重要度
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            ユーザー
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            IPアドレス
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            詳細
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {securityLogs.map((log) => {
                          const severityColors = {
                            low: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
                            medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
                            high: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
                            critical: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
                          };

                          const typeLabels: Record<string, string> = {
                            login_attempt: 'ログイン試行',
                            login_success: 'ログイン成功',
                            login_failure: 'ログイン失敗',
                            rate_limit_exceeded: 'レート制限超過',
                            csrf_failure: 'CSRF失敗',
                            admin_action: '管理者操作',
                            account_suspended: 'アカウント停止',
                            account_activated: 'アカウント有効化',
                            account_locked: 'アカウントロック',
                            password_change: 'パスワード変更',
                            unauthorized_access: '不正アクセス試行',
                          };

                          const severityLabels: Record<string, string> = {
                            low: '低',
                            medium: '中',
                            high: '高',
                            critical: '緊急',
                          };

                          return (
                            <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                {new Date(log.timestamp).toLocaleString('ja-JP')}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                {typeLabels[log.type] || log.type}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${severityColors[log.severity]}`}>
                                  {severityLabels[log.severity]}
                                </span>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                {log.email || log.userId || '-'}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                {log.ip || '-'}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                                {log.details ? JSON.stringify(log.details, null, 2) : '-'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* お知らせ管理タブ */}
          {activeTab === 'announcements' && (
            <div className="space-y-6">
              {/* お知らせ作成/編集フォーム */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                  {editingAnnouncement ? 'お知らせを編集' : 'お知らせを作成'}
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      タイトル <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={announcementForm.title}
                      onChange={(e) => setAnnouncementForm({ ...announcementForm, title: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                      placeholder="お知らせのタイトル"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      お知らせの種類 <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={announcementForm.type}
                      onChange={(e) => setAnnouncementForm({ ...announcementForm, type: e.target.value as any })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    >
                      <option value="info">📢 通常のお知らせ（青）</option>
                      <option value="maintenance">🔧 メンテナンス（オレンジ）</option>
                      <option value="emergency">🚨 緊急メンテナンス（赤）</option>
                      <option value="warning">⚠️ 警告（黄）</option>
                      <option value="success">✅ 成功・完了（緑）</option>
                    </select>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      選択した種類に応じて、アイコンとデザインが自動的に適用されます
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      内容 <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={announcementForm.content}
                      onChange={(e) => setAnnouncementForm({ ...announcementForm, content: e.target.value })}
                      rows={6}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                      placeholder="お知らせの内容"
                    />
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={announcementForm.isVisible}
                        onChange={(e) => setAnnouncementForm({ ...announcementForm, isVisible: e.target.checked })}
                        className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">表示する</span>
                    </label>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        公開日時（任意）
                      </label>
                      <input
                        type="datetime-local"
                        value={announcementForm.publishedAt}
                        onChange={(e) => setAnnouncementForm({ ...announcementForm, publishedAt: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        有効期限（任意）
                      </label>
                      <input
                        type="datetime-local"
                        value={announcementForm.expiresAt}
                        onChange={(e) => setAnnouncementForm({ ...announcementForm, expiresAt: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={editingAnnouncement ? handleUpdateAnnouncement : handleCreateAnnouncement}
                      disabled={submittingAnnouncement}
                      className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                    >
                      {submittingAnnouncement ? '処理中...' : editingAnnouncement ? '更新' : '作成'}
                    </button>
                    {editingAnnouncement && (
                      <button
                        onClick={handleCancelEdit}
                        disabled={submittingAnnouncement}
                        className="px-6 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
                      >
                        キャンセル
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* お知らせ一覧 */}
              {loading && announcements.length === 0 ? (
                <div className="flex justify-center items-center h-64">
                  <div className="w-8 h-8 border-2 border-gray-300 border-t-indigo-600 rounded-full animate-spin"></div>
                </div>
              ) : announcements.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 text-center">
                  <p className="text-gray-600 dark:text-gray-300">
                    お知らせがありません
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {announcements.map((announcement) => (
                    <div
                      key={announcement.id}
                      className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 ${
                        !announcement.isVisible ? 'opacity-60' : ''
                      }`}
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                            {announcement.title}
                          </h3>
                          <div className="flex gap-2 mb-2 flex-wrap">
                            {(() => {
                              const typeLabels: Record<string, { label: string; color: string }> = {
                                emergency: { label: '🚨 緊急', color: 'bg-red-200 dark:bg-red-900/30 text-red-800 dark:text-red-300' },
                                maintenance: { label: '🔧 メンテナンス', color: 'bg-orange-200 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300' },
                                info: { label: '📢 通常', color: 'bg-blue-200 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300' },
                                warning: { label: '⚠️ 警告', color: 'bg-yellow-200 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300' },
                                success: { label: '✅ 成功', color: 'bg-green-200 dark:bg-green-900/30 text-green-800 dark:text-green-300' },
                              };
                              const typeInfo = typeLabels[announcement.type || 'info'] || typeLabels.info;
                              return (
                                <span className={`px-2 py-1 text-xs ${typeInfo.color} rounded font-semibold`}>
                                  {typeInfo.label}
                                </span>
                              );
                            })()}
                            {!announcement.isVisible && (
                              <span className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded">
                                非表示
                              </span>
                            )}
                            {announcement.publishedAt && new Date(announcement.publishedAt) > new Date() && (
                              <span className="px-2 py-1 text-xs bg-yellow-200 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 rounded">
                                公開予定
                              </span>
                            )}
                            {announcement.expiresAt && new Date(announcement.expiresAt) < new Date() && (
                              <span className="px-2 py-1 text-xs bg-red-200 dark:bg-red-900/30 text-red-800 dark:text-red-300 rounded">
                                期限切れ
                              </span>
                            )}
                          </div>
                          <p className="text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
                            {announcement.content}
                          </p>
                          <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                            <p>作成日時: {new Date(announcement.createdAt).toLocaleString('ja-JP')}</p>
                            {announcement.publishedAt && (
                              <p>公開日時: {new Date(announcement.publishedAt).toLocaleString('ja-JP')}</p>
                            )}
                            {announcement.expiresAt && (
                              <p>有効期限: {new Date(announcement.expiresAt).toLocaleString('ja-JP')}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2 ml-4">
                          <button
                            onClick={() => handleEditAnnouncement(announcement)}
                            className="px-3 py-1 text-sm bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                          >
                            編集
                          </button>
                          <button
                            onClick={() => handleDeleteAnnouncement(announcement.id)}
                            className="px-3 py-1 text-sm bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                          >
                            削除
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
