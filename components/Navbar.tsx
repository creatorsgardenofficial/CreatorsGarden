'use client';

import Link from 'next/link';
import { useEffect, useLayoutEffect, useState, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { User } from '@/types';
import ChatPanel from './ChatPanel';
import UserGuideModal from './UserGuideModal';
import { creatorTypeLabels } from '@/lib/creatorTypes';

export default function Navbar() {
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showChatPanel, setShowChatPanel] = useState(false);
  const [showUserGuideModal, setShowUserGuideModal] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [feedbackNotificationCount, setFeedbackNotificationCount] = useState(0);
  const [showSidebar, setShowSidebar] = useState(false);

  const fetchUser = async (skipLoading = false) => {
    if (!skipLoading) {
      setLoading(true);
    }
    try {
      // キャッシュを無効化して最新のユーザー情報を取得（自動同期も試みる）
      const res = await fetch('/api/auth/me', {
        credentials: 'include',
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
        },
      });
      
      const data = await res.json();
      
      if (res.ok) {
        if (data.user) {
          const previousPlan = user?.subscription?.planType;
          setUser(data.user);
          
          // プランが変更された場合（自動同期の結果）
          // プラン変更は自動的に反映されるため、特別な処理は不要
          
          // 管理者チェック
          try {
            const adminRes = await fetch('/api/admin/check', {
              credentials: 'include',
            });
            const adminData = await adminRes.json();
            setIsAdmin(adminData.isAdmin || false);
          } catch (adminError) {
            // 管理者チェックのエラーは無視
            setIsAdmin(false);
          }
        } else {
          // user: null の場合は未ログイン
          setUser(null);
          setIsAdmin(false);
        }
      } else {
        if (res.status === 403 && data.error?.includes('利用停止')) {
          // 利用停止エラーの場合、自動ログアウト
          await fetch('/api/auth/logout', { method: 'POST' });
          setUser(null);
          setIsAdmin(false);
          alert('このアカウントは利用停止されています');
          window.location.href = '/';
          return;
        } else {
          setUser(null);
          setIsAdmin(false);
        }
      }
      setLoading(false);
    } catch (error) {
      // エラーは静かに無視
      setLoading(false);
    }
  };

  // 未読メッセージ数を取得（DMチャット + グループチャット）
  const fetchUnreadCount = useCallback(async () => {
    if (!user) return;
    try {
      // DMチャットの会話一覧を取得
      const dmRes = await fetch('/api/messages');
      const dmData = await dmRes.json();
      const dmViewedData = localStorage.getItem('dmChatViewed');
      const dmViewed = dmViewedData ? JSON.parse(dmViewedData) : {};
      
      let dmUnreadCount = 0;
      if (dmRes.ok && dmData.conversations) {
        // ローカルの実装に合わせて、APIから返されるunreadCountをそのまま使用
        // APIから返されるunreadCountは既にreadフラグに基づいて計算されているため、そのまま使用
        for (const conv of dmData.conversations) {
          // 自分が送信したメッセージは通知対象外（senderIdが存在する場合のみチェック）
          if (conv.lastMessage && conv.lastMessage.senderId && conv.lastMessage.senderId === user.id) {
            continue;
          }
          dmUnreadCount += conv.unreadCount || 0;
        }
      }
      
      // グループチャットの一覧を取得
      const groupRes = await fetch('/api/group-chats');
      const groupData = await groupRes.json();
      
      let groupUnreadCount = 0;
      if (groupRes.ok && groupData.groupChats) {
        // ローカルの実装に合わせて、APIから返されるunreadCountをそのまま使用
        // APIから返されるunreadCountは既にreadByフィールドに基づいて計算されているため、そのまま使用
        for (const gc of groupData.groupChats) {
          // 自分が送信したメッセージは通知対象外（senderIdが存在する場合のみチェック）
          if (gc.lastMessage && gc.lastMessage.senderId && gc.lastMessage.senderId === user.id) {
            continue;
          }
          // unreadCountが0より大きい場合のみカウント（既読のメッセージは除外済み）
          if (gc.unreadCount > 0) {
            console.log(`[Navbar] Group ${gc.id} has unreadCount: ${gc.unreadCount}`);
            groupUnreadCount += gc.unreadCount;
          }
        }
      }
      
      console.log(`[Navbar] Total unread count: DM=${dmUnreadCount}, Group=${groupUnreadCount}, Total=${dmUnreadCount + groupUnreadCount}`);
      
      setUnreadCount(dmUnreadCount + groupUnreadCount);
    } catch (err) {
      // エラーは静かに無視
    }
  }, [user]);

  // ご意見箱の通知数を取得
  const fetchFeedbackNotificationCount = async () => {
    if (!user) return;
    
    // 管理者画面にいる場合は通知を取得しない（最新のpathnameをチェック）
    // 非同期処理の前後でチェックして、確実に通知を0にする
    const currentPath = window.location.pathname;
    if (isAdmin && currentPath === '/admin') {
      setFeedbackNotificationCount(0);
      return;
    }
    
    // 管理者の場合、確認済みのタイムスタンプをチェック
    if (isAdmin) {
      // 再度チェック（非同期処理中にpathnameが変わった可能性がある）
      const checkPath = window.location.pathname;
      if (checkPath === '/admin') {
        setFeedbackNotificationCount(0);
        return;
      }
      
      try {
        const res = await fetch('/api/admin/feedback');
        // レスポンス取得後にもう一度チェック
        const finalCheckPath = window.location.pathname;
        if (finalCheckPath === '/admin') {
          setFeedbackNotificationCount(0);
          return;
        }
        
        const data = await res.json();
        if (res.ok && data.feedbacks) {
          const lastViewed = localStorage.getItem('adminFeedbackLastViewed');
          const lastViewedTime = lastViewed ? new Date(lastViewed).getTime() : 0;
          
          // 確認済みタイムスタンプ以降に新しく追加されたユーザーメッセージがあるフィードバックをカウント
          const unreadCount = data.feedbacks.filter((f: { 
            id: string; 
            createdAt: string; 
            messages?: Array<{ id: string; createdAt: string; senderType: string }>; 
            reply?: string;
          }) => {
            // 最後のメッセージがユーザーからのもの（管理者が返信すべき）
            if (f.messages && f.messages.length > 0) {
              const lastMessage = f.messages[f.messages.length - 1];
              // 最後のメッセージがユーザーからのもので、確認済みタイムスタンプ以降に追加されたもの
              if (lastMessage.senderType === 'user') {
                const lastMessageTime = new Date(lastMessage.createdAt).getTime();
                // 確認済みタイムスタンプがない場合、または確認済みタイムスタンプ以降のメッセージの場合
                return lastViewedTime === 0 || lastMessageTime > lastViewedTime;
              }
              return false;
            }
            // メッセージがない場合、replyフィールドで判定
            // 確認済みタイムスタンプがない場合、または確認済みタイムスタンプ以降に作成されたフィードバックの場合
            if (!f.reply) {
              const feedbackTime = new Date(f.createdAt).getTime();
              return lastViewedTime === 0 || feedbackTime > lastViewedTime;
            }
            return false;
          }).length;
          
          setFeedbackNotificationCount(unreadCount);
          return;
        }
      } catch (err) {
        // エラーは静かに無視
      }
    }
    
    try {
      const res = await fetch('/api/feedback/notifications');
      // レスポンス取得後にもう一度チェック
      const finalCheckPath = window.location.pathname;
      if (isAdmin && finalCheckPath === '/admin') {
        setFeedbackNotificationCount(0);
        return;
      }
      
      const data = await res.json();
      if (res.ok && data.count !== undefined) {
        // ユーザーの場合、ローカルストレージから既読状態を取得してフィルタリング
        if (!isAdmin) {
          const stored = localStorage.getItem('readReplyIds');
          if (stored) {
            try {
              const readIds = new Set(JSON.parse(stored));
              // サーバーから取得した返信があるフィードバック数から、既読のものを除外
              // 実際のフィードバック一覧を取得して正確にカウント
              const feedbackRes = await fetch('/api/feedback/my');
              const feedbackData = await feedbackRes.json();
              if (feedbackRes.ok && feedbackData.feedbacks) {
                const unreadReplies = feedbackData.feedbacks.filter(
                  (f: { id: string; reply?: string; messages?: Array<{ senderType: string }> }) => {
                    const hasAdminReply = f.reply || (f.messages && f.messages.some((m: { senderType: string }) => m.senderType === 'admin'));
                    return hasAdminReply && !readIds.has(f.id);
                  }
                );
                setFeedbackNotificationCount(unreadReplies.length);
                return;
              }
            } catch (e) {
              // エラーは無視
            }
          }
        }
        setFeedbackNotificationCount(data.count);
      }
    } catch (err) {
      // エラーは静かに無視
    }
  };

  useEffect(() => {
    fetchUser();

    // プロフィール更新イベントをリッスン
    const handleProfileUpdate = (event: Event) => {
      const customEvent = event as CustomEvent;
      // イベントにユーザーデータが含まれている場合は直接更新
      if (customEvent.detail) {
        setUser(customEvent.detail);
      } else {
        // 含まれていない場合は再取得
        fetchUser(true);
      }
    };

    window.addEventListener('profileUpdated', handleProfileUpdate);

    return () => {
      window.removeEventListener('profileUpdated', handleProfileUpdate);
    };
  }, []);

  // pathnameが変更されたら通知をリセット（管理者画面の場合）- DOM更新前に実行
  useLayoutEffect(() => {
    if (isAdmin && pathname === '/admin') {
      // 確認済みタイムスタンプを即座に更新して通知をリセット
      localStorage.setItem('adminFeedbackLastViewed', new Date().toISOString());
      setFeedbackNotificationCount(0);
    }
  }, [isAdmin, pathname]);

  // 未読メッセージ数とご意見箱の通知数を定期的に更新
  useEffect(() => {
    if (user) {
      fetchUnreadCount();
      // 管理者画面にいる場合は通知を取得しない（常に0にする）
      if (isAdmin && pathname === '/admin') {
        // 確認済みタイムスタンプを即座に更新して通知をリセット
        localStorage.setItem('adminFeedbackLastViewed', new Date().toISOString());
        setFeedbackNotificationCount(0);
      } else {
        fetchFeedbackNotificationCount();
      }
      const interval = setInterval(() => {
        fetchUnreadCount();
        // 管理者画面にいる場合は通知を取得しない（常に0にする）
        const currentPath = window.location.pathname;
        if (isAdmin && currentPath === '/admin') {
          setFeedbackNotificationCount(0);
        } else {
          fetchFeedbackNotificationCount();
        }
      }, 10000); // 10秒ごと（レート制限を考慮して間隔を延長）
      return () => clearInterval(interval);
    } else {
      setFeedbackNotificationCount(0);
    }
  }, [user, isAdmin, pathname]);

    // チャットを閲覧したら通知をリセット
  useEffect(() => {
    if (!user) return;
    
    const handleChatViewed = () => {
      // 既読処理とグループチャット一覧の更新が完了するまで少し待ってから通知数を更新
      setTimeout(() => {
        fetchUnreadCount();
      }, 1200);
    };

    window.addEventListener('chatViewed', handleChatViewed);

    return () => {
      window.removeEventListener('chatViewed', handleChatViewed);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // 管理者画面でフィードバックを閲覧したら通知をリセット
  useEffect(() => {
    if (!isAdmin) return;

    const handleFeedbackViewed = () => {
      // 確認済みのタイムスタンプを保存
      localStorage.setItem('adminFeedbackLastViewed', new Date().toISOString());
      setFeedbackNotificationCount(0);
    };

    window.addEventListener('feedbackViewed', handleFeedbackViewed);

    return () => {
      window.removeEventListener('feedbackViewed', handleFeedbackViewed);
    };
  }, [isAdmin]);


  const handleLogout = async () => {
    try {
      const res = await fetch('/api/auth/logout', { 
        method: 'POST',
        credentials: 'include',
      });
      
      if (res.ok) {
        // ログアウト成功
        setUser(null);
        setIsAdmin(false);
        setUnreadCount(0);
        setFeedbackNotificationCount(0);
        // ローカルストレージをクリア
        localStorage.removeItem('dmChatViewed');
        // ホームページにリダイレクト
        window.location.href = '/';
      } else {
        // ログアウト失敗（エラーが発生した場合でも、クライアント側の状態をリセット）
        // ログアウトエラーは静かに無視
        setUser(null);
        setIsAdmin(false);
        setUnreadCount(0);
        setFeedbackNotificationCount(0);
        localStorage.removeItem('dmChatViewed');
        window.location.href = '/';
      }
    } catch (error) {
      // ネットワークエラーなど（エラーが発生した場合でも、クライアント側の状態をリセット）
      // ログアウトエラーは静かに無視
      setUser(null);
      setIsAdmin(false);
      setUnreadCount(0);
      setFeedbackNotificationCount(0);
      localStorage.removeItem('dmChatViewed');
      window.location.href = '/';
    }
  };


  return (
    <>
      <nav className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-50 relative">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center h-16 pl-2 sm:pl-4 md:pl-6 lg:pl-8 pr-2 sm:pr-4 md:pr-6 lg:pr-8">
            <Link 
              href="/" 
              onClick={() => {
                // チャットパネルが開いている場合は閉じる
                if (showChatPanel) {
                  setShowChatPanel(false);
                }
              }}
              className="text-lg sm:text-xl md:text-2xl font-bold bg-gradient-to-r from-purple-600 to-green-600 dark:from-purple-400 dark:to-green-400 bg-clip-text text-transparent hover:from-purple-700 hover:to-green-700 dark:hover:from-purple-300 dark:hover:to-green-300 transition-all flex-shrink-0"
            >
              <span className="text-xl sm:text-2xl md:text-3xl mr-1 sm:mr-2">🌱</span>
              Creators Garden
            </Link>
            
            {/* デスクトップ表示 */}
            <div className="hidden lg:flex items-center gap-3 md:gap-4 ml-auto">
            <button
              onClick={() => setShowUserGuideModal(true)}
              className="text-xs sm:text-sm md:text-base text-gray-700 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 transition-colors whitespace-nowrap flex-shrink-0 py-2"
            >
              ユーザーガイド
            </button>
            <Link
              href="/posts"
              className="text-xs sm:text-sm md:text-base text-gray-700 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 transition-colors whitespace-nowrap flex-shrink-0 py-2"
            >
              投稿一覧
            </Link>
            {!isAdmin && (
              <Link
                href="/feedback"
                className="relative text-xs sm:text-sm md:text-base text-gray-700 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 transition-colors whitespace-nowrap flex-shrink-0 py-2"
              >
                ご意見箱
                {feedbackNotificationCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full min-w-[16px] h-[16px] flex items-center justify-center px-0.5">
                    {feedbackNotificationCount > 99 ? '99+' : feedbackNotificationCount}
                  </span>
                )}
              </Link>
            )}
            
            {loading ? (
              <div className="w-8 h-8 border-2 border-gray-300 border-t-purple-600 rounded-full animate-spin"></div>
            ) : user ? (
              <>
                {isAdmin && (
                  <Link
                    href="/admin"
                    className="relative text-xs sm:text-sm md:text-base text-gray-700 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 transition-colors whitespace-nowrap flex-shrink-0 py-2"
                  >
                    管理者
                    {feedbackNotificationCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full min-w-[16px] h-[16px] flex items-center justify-center px-0.5">
                        {feedbackNotificationCount > 99 ? '99+' : feedbackNotificationCount}
                      </span>
                    )}
                  </Link>
                )}
                <button
                  onClick={() => setShowChatPanel(true)}
                  className="relative text-gray-700 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 transition-colors flex-shrink-0 py-2"
                  title="メッセージ"
                >
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] rounded-full w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>
                <Link
                  href="/posts/new"
                  className="px-2 sm:px-3 md:px-4 py-1 sm:py-1.5 md:py-2 bg-gradient-to-r from-purple-600 to-purple-500 text-white rounded-lg hover:from-purple-700 hover:to-purple-600 transition-all shadow-md hover:shadow-lg text-xs sm:text-sm md:text-base whitespace-nowrap flex-shrink-0"
                >
                  投稿する
                </Link>
                <div className="flex items-center gap-1 sm:gap-2 md:gap-3 flex-shrink-0">
                  <Link
                    href="/profile"
                    className="text-xs sm:text-sm md:text-base font-medium text-gray-900 dark:text-gray-100 hover:text-purple-600 dark:hover:text-purple-400 transition-colors whitespace-nowrap py-2"
                  >
                    マイページ
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="px-2 sm:px-3 md:px-4 py-1 sm:py-1.5 md:py-2 text-xs sm:text-sm md:text-base text-gray-700 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 transition-colors whitespace-nowrap"
                  >
                    ログアウト
                  </button>
                </div>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-gray-700 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                >
                  ログイン
                </Link>
                <Link
                  href="/register"
                  className="px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-500 text-white rounded-lg hover:from-purple-700 hover:to-purple-600 transition-all shadow-md hover:shadow-lg"
                >
                  新規登録
                </Link>
              </>
            )}
            </div>

            {/* モバイル: ハンバーガーメニューボタン */}
            <button
              onClick={() => setShowSidebar(true)}
              className="lg:hidden text-gray-700 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 transition-colors p-2"
              aria-label="メニューを開く"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </nav>

      {/* サイドバー（モバイル用） */}
      {showSidebar && (
        <>
          {/* オーバーレイ（透明にして背景が見えるように） */}
          <div
            className="fixed inset-0 bg-transparent z-40 lg:hidden"
            onClick={() => setShowSidebar(false)}
          />
          {/* サイドバー（左側から表示） */}
          <div className="fixed top-0 left-0 h-full w-64 bg-white dark:bg-gray-900 shadow-xl z-50 lg:hidden transform transition-transform duration-300 ease-in-out overflow-y-auto">
            <div className="p-3">
              {/* 閉じるボタン */}
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">メニュー</h2>
                <button
                  onClick={() => setShowSidebar(false)}
                  className="text-gray-700 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 transition-colors p-2"
                  aria-label="メニューを閉じる"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* ナビゲーションリンク */}
              <nav className="space-y-1">
                <button
                  onClick={() => {
                    setShowUserGuideModal(true);
                    setShowSidebar(false);
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-purple-50 dark:hover:bg-gray-800 hover:text-purple-600 dark:hover:text-purple-400 rounded-lg transition-colors"
                >
                  ユーザーガイド
                </button>
                <Link
                  href="/posts"
                  onClick={() => setShowSidebar(false)}
                  className="block px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-purple-50 dark:hover:bg-gray-800 hover:text-purple-600 dark:hover:text-purple-400 rounded-lg transition-colors"
                >
                  投稿一覧
                </Link>
                {!isAdmin && (
                  <Link
                    href="/feedback"
                    onClick={() => setShowSidebar(false)}
                    className="relative block px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-purple-50 dark:hover:bg-gray-800 hover:text-purple-600 dark:hover:text-purple-400 rounded-lg transition-colors"
                  >
                    ご意見箱
                    {feedbackNotificationCount > 0 && (
                      <span className="absolute top-1 right-2 bg-red-500 text-white text-xs font-bold rounded-full min-w-[16px] h-[16px] flex items-center justify-center px-0.5">
                        {feedbackNotificationCount > 99 ? '99+' : feedbackNotificationCount}
                      </span>
                    )}
                  </Link>
                )}
                {user && (
                  <>
                    {isAdmin && (
                      <Link
                        href="/admin"
                        onClick={() => setShowSidebar(false)}
                        className="relative block px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-purple-50 dark:hover:bg-gray-800 hover:text-purple-600 dark:hover:text-purple-400 rounded-lg transition-colors"
                      >
                        管理者
                        {feedbackNotificationCount > 0 && (
                          <span className="absolute top-1 right-2 bg-red-500 text-white text-xs font-bold rounded-full min-w-[16px] h-[16px] flex items-center justify-center px-0.5">
                            {feedbackNotificationCount > 99 ? '99+' : feedbackNotificationCount}
                          </span>
                        )}
                      </Link>
                    )}
                    <button
                      onClick={() => {
                        setShowChatPanel(true);
                        setShowSidebar(false);
                      }}
                      className="relative w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-purple-50 dark:hover:bg-gray-800 hover:text-purple-600 dark:hover:text-purple-400 rounded-lg transition-colors flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      メッセージ
                      {unreadCount > 0 && (
                        <span className="ml-auto bg-red-500 text-white text-xs font-bold rounded-full min-w-[16px] h-[16px] flex items-center justify-center px-0.5">
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                      )}
                    </button>
                    <Link
                      href="/posts/new"
                      onClick={() => setShowSidebar(false)}
                      className="block px-3 py-2 text-sm bg-gradient-to-r from-purple-600 to-purple-500 text-white rounded-lg hover:from-purple-700 hover:to-purple-600 transition-all shadow-md text-center font-semibold"
                    >
                      投稿する
                    </Link>
                    <Link
                      href="/profile"
                      onClick={() => setShowSidebar(false)}
                      className="block px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-purple-50 dark:hover:bg-gray-800 hover:text-purple-600 dark:hover:text-purple-400 rounded-lg transition-colors"
                    >
                      マイページ
                    </Link>
                    <button
                      onClick={() => {
                        handleLogout();
                        setShowSidebar(false);
                      }}
                      className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-purple-50 dark:hover:bg-gray-800 hover:text-purple-600 dark:hover:text-purple-400 rounded-lg transition-colors"
                    >
                      ログアウト
                    </button>
                  </>
                )}
                {!user && (
                  <>
                    <Link
                      href="/login"
                      onClick={() => setShowSidebar(false)}
                      className="block px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-purple-50 dark:hover:bg-gray-800 hover:text-purple-600 dark:hover:text-purple-400 rounded-lg transition-colors"
                    >
                      ログイン
                    </Link>
                    <Link
                      href="/register"
                      onClick={() => setShowSidebar(false)}
                      className="block px-3 py-2 text-sm bg-gradient-to-r from-purple-600 to-purple-500 text-white rounded-lg hover:from-purple-700 hover:to-purple-600 transition-all shadow-md text-center font-semibold"
                    >
                      新規登録
                    </Link>
                  </>
                )}
              </nav>
            </div>
          </div>
        </>
      )}

      {showChatPanel && user && (
        <ChatPanel
          currentUserId={user.id}
          onClose={() => {
            setShowChatPanel(false);
            fetchUnreadCount(); // 閉じた時に未読数を更新
          }}
        />
      )}

      {showUserGuideModal && (
        <UserGuideModal
          onClose={() => setShowUserGuideModal(false)}
        />
      )}
    </>
  );
}

