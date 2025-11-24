'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { User, Message, Conversation, CreatorType } from '@/types';
import { creatorTypeLabels } from '@/lib/creatorTypes';

interface ConversationWithDetails extends Conversation {
  lastMessage?: Message | null;
  unreadCount: number;
  otherUser?: {
    id: string;
    username: string;
    creatorType: CreatorType;
  } | null;
}

interface DMChatProps {
  currentUserId: string;
  onClose: () => void;
  initialUserId?: string; // 初期表示するユーザーID（投稿からDMに遷移する場合）
  embedded?: boolean; // 埋め込みモード（モーダル部分を表示しない）
}

export default function DMChat({ currentUserId, onClose, initialUserId, embedded = false }: DMChatProps) {
  const [conversations, setConversations] = useState<ConversationWithDetails[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<ConversationWithDetails | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageContent, setMessageContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [showUserList, setShowUserList] = useState(false);
  const [userPage, setUserPage] = useState(1);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [hasMoreUsers, setHasMoreUsers] = useState(true);
  const usersListRef = useRef<HTMLDivElement>(null);
  const isLoadingRef = useRef(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [deletingMessageId, setDeletingMessageId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blocking, setBlocking] = useState(false);

  // メッセージを最下部にスクロール
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 会話一覧を取得
  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch('/api/messages');
      const data = await res.json();
      if (res.ok && data.conversations) {
        setConversations(data.conversations);
      }
    } catch (err) {
      // エラーは静かに無視
    }
  }, []);

  // メッセージを取得
  const fetchMessages = useCallback(async (conversationId: string) => {
    try {
      const res = await fetch(`/api/messages?conversationId=${conversationId}`);
      const data = await res.json();
      if (res.ok && data.messages) {
        setMessages(data.messages);
      }
    } catch (err) {
      // エラーは静かに無視
    }
  }, []);

  // ユーザー一覧を取得（新規会話作成用）
  const fetchUsers = useCallback(async (page: number = 1, append: boolean = false) => {
    if (isLoadingRef.current) return;
    
    isLoadingRef.current = true;
    setLoadingUsers(true);
    try {
      const res = await fetch(`/api/users?page=${page}&limit=10`);
      const data = await res.json();
      if (res.ok && data.users) {
        // 自分を除外
        const otherUsers = data.users.filter((u: User) => u.id !== currentUserId);
        
        if (append) {
          setUsers(prev => [...prev, ...otherUsers]);
        } else {
          setUsers(otherUsers);
        }
        
        // ページネーション情報を更新
        if (data.pagination) {
          setHasMoreUsers(data.pagination.hasMore);
        }
      }
    } catch (err) {
      // エラーは静かに無視
    } finally {
      setLoadingUsers(false);
      isLoadingRef.current = false;
    }
  }, [currentUserId]);

  // 初期データ取得
  useEffect(() => {
    const loadData = async () => {
      await fetchConversations();
      await fetchUsers(1, false);
      setUserPage(1);
      setHasMoreUsers(true);
      setLoading(false);
    };
    loadData();
  }, [currentUserId, fetchConversations, fetchUsers]);

  // ユーザー一覧表示が切り替わったときにリセット
  useEffect(() => {
    if (showUserList) {
      // ユーザー一覧を表示するときに、最初のページから読み込む
      setUserPage(1);
      setHasMoreUsers(true);
      setUsers([]);
      fetchUsers(1, false);
    }
  }, [showUserList, fetchUsers]);

  // スクロールイベントでページネーション
  useEffect(() => {
    if (!showUserList) return;

    const handleScroll = () => {
      const element = usersListRef.current;
      if (!element) return;

      const { scrollTop, scrollHeight, clientHeight } = element;
      // 最下部から100px以内に到達したら次のページを読み込む
      const threshold = 100;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < threshold;
      
      // 読み込み中または次のページがない場合は何もしない
      if (!isNearBottom || !hasMoreUsers || isLoadingRef.current) {
        return;
      }
      
      // 次のページを読み込む
      const nextPage = userPage + 1;
      setUserPage(nextPage);
      fetchUsers(nextPage, true);
    };

    const element = usersListRef.current;
    if (!element) return;

    // スクロールイベントを追加
    element.addEventListener('scroll', handleScroll, { passive: true });
    
    // 初期チェック（既にスクロール可能な場合）
    // 少し遅延させて、レンダリング後に実行
    const timeoutId = setTimeout(() => {
      handleScroll();
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      element.removeEventListener('scroll', handleScroll);
    };
  }, [showUserList, hasMoreUsers, userPage, fetchUsers]);

  // 会話選択
  const handleSelectConversation = useCallback((conversation: ConversationWithDetails) => {
    setSelectedConversation(conversation);
    fetchMessages(conversation.id);
    setShowUserList(false);
    
    // 確認済みタイムスタンプを記録
    const dmViewedData = localStorage.getItem('dmChatViewed');
    const viewed = dmViewedData ? JSON.parse(dmViewedData) : {};
    viewed[conversation.id] = new Date().toISOString();
    localStorage.setItem('dmChatViewed', JSON.stringify(viewed));
    
    // 通知をリセットするためにイベントを発火
    window.dispatchEvent(new CustomEvent('chatViewed'));
  }, [fetchMessages]);

  // 新規会話開始
  const handleStartConversation = useCallback(async (userId: string, skipAutoMessage = false) => {
    try {
      // 既存の会話を探す
      const existing = conversations.find(c => c.otherUser?.id === userId);
      if (existing) {
        handleSelectConversation(existing);
        setShowUserList(false);
        return;
      }

      // 既存の会話がない場合、ユーザー情報を取得して仮の会話を作成
      const targetUser = users.find(u => u.id === userId);
      if (targetUser) {
        // 仮の会話オブジェクトを作成（まだAPIには送信していない）
        const tempConversation: ConversationWithDetails = {
          id: 'temp-' + Date.now(),
          participantIds: [currentUserId, userId].sort(),
          createdAt: new Date().toISOString(),
          lastMessage: null,
          unreadCount: 0,
          otherUser: {
            id: targetUser.id,
            username: targetUser.username,
            creatorType: targetUser.creatorType,
          },
        };
        setShowUserList(false);
        setSelectedConversation(tempConversation);
        setMessages([]);
        return;
      }
    } catch (err) {
      // エラーは静かに無視
    }
  }, [conversations, users, currentUserId, handleSelectConversation]);

  // 初期ユーザーIDが指定されている場合、そのユーザーとの会話を開始
  useEffect(() => {
    if (initialUserId && initialUserId !== currentUserId && conversations.length > 0) {
      // 会話一覧が読み込まれた後に実行
      const existing = conversations.find(c => c.otherUser?.id === initialUserId);
      if (existing) {
        handleSelectConversation(existing);
      } else {
        // 会話が存在しない場合は、会話を開始（空のメッセージは送信しない）
        handleStartConversation(initialUserId, true);
      }
    }
  }, [initialUserId, conversations, currentUserId, handleSelectConversation, handleStartConversation]);

  // ブロック状態を確認
  const checkBlockStatus = useCallback(async (otherUserId: string) => {
    try {
      const res = await fetch(`/api/messages/block?userId=${otherUserId}`);
      const data = await res.json();
      if (res.ok) {
        setIsBlocked(data.blocked || false);
      }
    } catch (err) {
      // エラーは静かに無視
    }
  }, []);

  // 会話選択時にメッセージを取得し、ブロック状態を確認
  useEffect(() => {
    if (selectedConversation?.id) {
      fetchMessages(selectedConversation.id);
      // ブロック状態を確認
      const otherUserId = selectedConversation.participantIds.find(id => id !== currentUserId);
      if (otherUserId) {
        checkBlockStatus(otherUserId);
      }
    }
  }, [selectedConversation?.id, fetchMessages, checkBlockStatus, currentUserId]);

  // リアルタイム更新（ポーリング）
  useEffect(() => {
    if (selectedConversation) {
      // 選択中の会話のメッセージを定期的に更新
      const interval = setInterval(() => {
        fetchMessages(selectedConversation.id);
        fetchConversations(); // 会話一覧も更新（未読数など）
      }, 2000); // 2秒ごと

      return () => {
        clearInterval(interval);
      };
    }
  }, [selectedConversation?.id, fetchMessages, fetchConversations]);

  // ユーザーをブロック
  const handleBlockUser = async () => {
    if (!selectedConversation) return;
    const otherUserId = selectedConversation.participantIds.find(id => id !== currentUserId);
    if (!otherUserId) return;

    if (!confirm('このユーザーをブロックしますか？ブロックすると、このユーザーとのメッセージのやり取りができなくなります。')) {
      return;
    }

    setBlocking(true);
    try {
      const res = await fetch('/api/messages/block', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blockedUserId: otherUserId }),
      });

      const data = await res.json();
      if (res.ok) {
        setIsBlocked(true);
        // 会話一覧を更新（ブロックされたユーザーは非表示になる）
        await fetchConversations();
        // 選択中の会話をクリア
        setSelectedConversation(null);
        setMessages([]);
        alert('ユーザーをブロックしました');
      } else {
        alert(data.error || 'ブロックに失敗しました');
      }
    } catch (err) {
      alert('ブロックに失敗しました');
    } finally {
      setBlocking(false);
    }
  };

  // ブロックを解除
  const handleUnblockUser = async () => {
    if (!selectedConversation) return;
    const otherUserId = selectedConversation.participantIds.find(id => id !== currentUserId);
    if (!otherUserId) return;

    setBlocking(true);
    try {
      const res = await fetch(`/api/messages/block?userId=${otherUserId}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (res.ok) {
        setIsBlocked(false);
        alert('ブロックを解除しました');
      } else {
        alert(data.error || 'ブロック解除に失敗しました');
      }
    } catch (err) {
      alert('ブロック解除に失敗しました');
    } finally {
      setBlocking(false);
    }
  };

  // メッセージ送信
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageContent.trim() || !selectedConversation) return;

    setSending(true);
    try {
      const otherUserId = selectedConversation.participantIds.find(id => id !== currentUserId);
      if (!otherUserId) return;

      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiverId: otherUserId,
          content: messageContent,
        }),
      });

      const data = await res.json();
      if (res.ok && data.message) {
        setMessageContent('');
        
        // 仮の会話の場合は、実際の会話に切り替え
        if (selectedConversation.id.startsWith('temp-')) {
          await fetchConversations();
          const updated = await fetch('/api/messages').then(r => r.json());
          if (updated.conversations) {
            const newConv = updated.conversations.find((c: ConversationWithDetails) => c.otherUser?.id === otherUserId);
            if (newConv) {
              setSelectedConversation(newConv);
              await fetchMessages(newConv.id);
            }
          }
        } else {
          // メッセージを即座に追加（リアルタイム感を出す）
          setMessages([...messages, data.message]);
          // 会話一覧も更新
          await fetchConversations();
        }
      } else {
        alert(data.error || 'メッセージの送信に失敗しました');
      }
    } catch (err) {
      alert('メッセージの送信に失敗しました');
    } finally {
      setSending(false);
    }
  };

  const content = (
    <>
      {/* ヘッダー */}
      {!embedded && (
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowUserList(!showUserList)}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              {showUserList ? '会話一覧' : '新規会話'}
            </button>
            {selectedConversation && !showUserList && (
              <div>
                <Link
                  href={`/users/${selectedConversation.otherUser?.id}`}
                  onClick={onClose}
                  className="text-lg font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  {selectedConversation.otherUser?.username || 'ユーザー'}
                </Link>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {selectedConversation.otherUser?.creatorType 
                    ? creatorTypeLabels[selectedConversation.otherUser.creatorType] 
                    : ''}
                </p>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {selectedConversation && !showUserList && (
              <button
                onClick={isBlocked ? handleUnblockUser : handleBlockUser}
                disabled={blocking}
                className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                  isBlocked
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/50'
                    : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/50'
                } disabled:opacity-50`}
              >
                {blocking ? '処理中...' : isBlocked ? 'ブロック解除' : 'ブロック'}
              </button>
            )}
            <button
              onClick={onClose}
              className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
      {embedded && (
        <div className="flex items-center gap-4 p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0" style={{ flexShrink: 0 }}>
          <button
            onClick={() => setShowUserList(!showUserList)}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            {showUserList ? '会話一覧' : '新規会話'}
          </button>
          {selectedConversation && !showUserList && (
            <div className="flex items-center gap-4 flex-1">
              <div>
                <Link
                  href={`/users/${selectedConversation.otherUser?.id}`}
                  onClick={onClose}
                  className="text-lg font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  {selectedConversation.otherUser?.username || 'ユーザー'}
                </Link>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {selectedConversation.otherUser?.creatorType 
                    ? creatorTypeLabels[selectedConversation.otherUser.creatorType] 
                    : ''}
                </p>
              </div>
              <button
                onClick={isBlocked ? handleUnblockUser : handleBlockUser}
                disabled={blocking}
                className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                  isBlocked
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/50'
                    : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/50'
                } disabled:opacity-50`}
              >
                {blocking ? '処理中...' : isBlocked ? 'ブロック解除' : 'ブロック'}
              </button>
            </div>
          )}
        </div>
      )}

        <div className="flex flex-1 overflow-hidden min-h-0" style={{ height: '100%', maxHeight: '100%' }}>
          {/* サイドバー（会話一覧 or ユーザー一覧） */}
          <div className={`w-80 border-r border-gray-200 dark:border-gray-700 flex flex-col ${showUserList ? '' : 'hidden md:block'}`} style={{ height: '100%', maxHeight: '100%', overflow: 'hidden' }}>
            {showUserList ? (
              <div className="flex flex-col" style={{ height: '100%', maxHeight: '100%', overflow: 'hidden' }}>
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">ユーザー一覧</h3>
                  <input
                    type="text"
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    placeholder="ユーザー名で検索..."
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white text-sm"
                  />
                </div>
                <div 
                  ref={usersListRef}
                  className="flex-1 overflow-y-auto p-4 space-y-2"
                  style={{ 
                    minHeight: 0, 
                    height: '100%',
                    maxHeight: '100%', 
                    overflowY: 'auto',
                    overflowX: 'hidden'
                  }}
                >
                  {(() => {
                    const filteredUsers = users.filter((user) => {
                      if (!userSearchQuery.trim()) return true;
                      const query = userSearchQuery.toLowerCase();
                      return user.username?.toLowerCase().includes(query) ||
                             creatorTypeLabels[user.creatorType]?.toLowerCase().includes(query);
                    });
                    
                    if (filteredUsers.length === 0) {
                      return (
                        <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                          {userSearchQuery.trim() ? '該当するユーザーが見つかりません' : 'ユーザーがありません'}
                        </div>
                      );
                    }
                    
                    return (
                      <>
                        {filteredUsers.map((user) => (
                          <div
                            key={user.id}
                            className="w-full p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                          >
                            <Link
                              href={`/users/${user.id}`}
                              onClick={onClose}
                              className="block font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
                            >
                              {user.username}
                            </Link>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {creatorTypeLabels[user.creatorType] || user.creatorType}
                            </div>
                            <button
                              onClick={() => handleStartConversation(user.id)}
                              className="mt-2 px-3 py-1 text-sm bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors"
                            >
                              DMを送る
                            </button>
                          </div>
                        ))}
                        {loadingUsers && (
                          <div className="text-center text-gray-500 dark:text-gray-400 py-4">
                            読み込み中...
                          </div>
                        )}
                        {!hasMoreUsers && !userSearchQuery.trim() && users.length > 0 && (
                          <div className="text-center text-gray-500 dark:text-gray-400 py-4">
                            すべてのユーザーを表示しました
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>
            ) : (
              <div className="p-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">会話一覧</h3>
                {loading ? (
                  <div className="text-center text-gray-500 dark:text-gray-400">読み込み中...</div>
                ) : conversations.length === 0 ? (
                  <div className="text-center text-gray-500 dark:text-gray-400">会話がありません</div>
                ) : (
                  <div className="space-y-2">
                    {conversations.map((conv) => (
                      <button
                        key={conv.id}
                        onClick={() => handleSelectConversation(conv)}
                        className={`w-full text-left p-3 rounded-lg transition-colors ${
                          selectedConversation?.id === conv.id
                            ? 'bg-purple-100 dark:bg-purple-900/30'
                            : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <Link
                            href={`/users/${conv.otherUser?.id}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              onClose();
                            }}
                            className="font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
                          >
                            {conv.otherUser?.username || 'ユーザー'}
                          </Link>
                          {conv.unreadCount > 0 && (
                            <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1">
                              {conv.unreadCount}
                            </span>
                          )}
                        </div>
                        {conv.lastMessage && (
                          <div className="text-sm text-gray-500 dark:text-gray-400 truncate mt-1">
                            {conv.lastMessage.content}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* メッセージエリア */}
          <div className="flex-1 flex flex-col">
            {selectedConversation ? (
              <>
                {/* メッセージリスト */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.map((message) => {
                    const isOwn = message.senderId === currentUserId;
                    const isEditing = editingMessageId === message.id;
                    return (
                      <div
                        key={message.id}
                        className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-xs lg:max-w-md ${isOwn ? 'flex flex-col items-end' : ''}`}>
                          <div
                            className={`px-4 py-2 rounded-lg relative group ${
                              isOwn
                                ? 'bg-purple-600 text-white'
                                : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
                            }`}
                          >
                            {isEditing ? (
                              <div className="space-y-2">
                                <input
                                  type="text"
                                  value={editingContent}
                                  onChange={(e) => setEditingContent(e.target.value)}
                                  className="w-full px-2 py-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded border border-gray-300 dark:border-gray-600"
                                  autoFocus
                                />
                                <div className="flex gap-2">
                                  <button
                                    onClick={async () => {
                                      try {
                                        const res = await fetch(`/api/messages/${message.id}`, {
                                          method: 'PUT',
                                          headers: { 'Content-Type': 'application/json' },
                                          body: JSON.stringify({ content: editingContent }),
                                        });
                                        if (res.ok) {
                                          setEditingMessageId(null);
                                          setEditingContent('');
                                          fetchMessages(selectedConversation!.id);
                                        } else {
                                          const data = await res.json();
                                          alert(data.error || 'メッセージの更新に失敗しました');
                                        }
                                      } catch (error) {
                                        alert('メッセージの更新に失敗しました');
                                      }
                                    }}
                                    className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                                  >
                                    保存
                                  </button>
                                  <button
                                    onClick={() => {
                                      setEditingMessageId(null);
                                      setEditingContent('');
                                    }}
                                    className="px-3 py-1 bg-gray-500 text-white text-xs rounded hover:bg-gray-600"
                                  >
                                    キャンセル
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <p className="text-sm">{message.content}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <p className={`text-xs ${isOwn ? 'text-purple-100' : 'text-gray-500 dark:text-gray-400'}`}>
                                    {new Date(message.createdAt).toLocaleTimeString('ja-JP', {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                    {message.updatedAt && (
                                      <span className="ml-1">(編集済み)</span>
                                    )}
                                  </p>
                                  {isOwn && (
                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                      <button
                                        onClick={() => {
                                          setEditingMessageId(message.id);
                                          setEditingContent(message.content);
                                        }}
                                        className="text-xs px-2 py-1 bg-purple-700 hover:bg-purple-800 rounded"
                                        title="編集"
                                      >
                                        編集
                                      </button>
                                      <button
                                        onClick={() => setDeletingMessageId(message.id)}
                                        className="text-xs px-2 py-1 bg-red-600 hover:bg-red-700 rounded"
                                        title="削除"
                                      >
                                        削除
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                {/* 削除確認ダイアログ */}
                {deletingMessageId && (
                  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 max-w-md mx-4">
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                        メッセージを削除しますか？
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400 mb-6">
                        この操作は取り消せません。
                      </p>
                      <div className="flex gap-3 justify-end">
                        <button
                          onClick={() => setDeletingMessageId(null)}
                          className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                        >
                          キャンセル
                        </button>
                        <button
                          onClick={async () => {
                            try {
                              const res = await fetch(`/api/messages/${deletingMessageId}`, {
                                method: 'DELETE',
                              });
                              if (res.ok) {
                                setDeletingMessageId(null);
                                fetchMessages(selectedConversation!.id);
                              } else {
                                const data = await res.json();
                                alert(data.error || 'メッセージの削除に失敗しました');
                              }
                            } catch (error) {
                              alert('メッセージの削除に失敗しました');
                            }
                          }}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors"
                        >
                          削除する
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* メッセージ入力 */}
                <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={messageContent}
                      onChange={(e) => setMessageContent(e.target.value)}
                      placeholder="メッセージを入力..."
                      className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                      disabled={sending}
                    />
                    <button
                      type="submit"
                      disabled={sending || !messageContent.trim()}
                      className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {sending ? '送信中...' : '送信'}
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400">
                会話を選択するか、新規会話を開始してください
              </div>
            )}
          </div>
        </div>
    </>
  );

  if (embedded) {
    return <div className="h-full w-full flex flex-col bg-transparent min-h-0" style={{ height: '100%', maxHeight: '100%' }}>{content}</div>;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col min-h-0">
        {content}
      </div>
    </div>
  );
}

