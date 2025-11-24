'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { User, GroupMessage, GroupChat as GroupChatType, CreatorType } from '@/types';
import { creatorTypeLabels } from '@/lib/creatorTypes';

interface GroupChatWithDetails extends GroupChatType {
  lastMessage?: GroupMessage | null;
  unreadCount: number;
  participants?: Array<{
    id: string;
    username: string;
    creatorType: string;
    publicId?: string;
  }>;
}

interface GroupChatProps {
  currentUserId: string;
  onClose: () => void;
  embedded?: boolean; // 埋め込みモード（モーダル部分を表示しない）
}

export default function GroupChat({ currentUserId, onClose, embedded = false }: GroupChatProps) {
  const [groupChats, setGroupChats] = useState<GroupChatWithDetails[]>([]);
  const [selectedGroupChat, setSelectedGroupChat] = useState<GroupChatWithDetails | null>(null);
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [messageContent, setMessageContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [participantPublicIds, setParticipantPublicIds] = useState<string[]>([]);
  const [participantUsers, setParticipantUsers] = useState<User[]>([]); // 参加者のユーザー情報を保持
  const [searchPublicId, setSearchPublicId] = useState('');
  const [searchedUser, setSearchedUser] = useState<User | null>(null);
  const [searching, setSearching] = useState(false);
  const [rightSideSearchQuery, setRightSideSearchQuery] = useState(''); // 右側の検索欄用
  const [rightSideSearchedUsers, setRightSideSearchedUsers] = useState<User[]>([]); // 右側の検索結果（複数件）
  const [rightSideSearching, setRightSideSearching] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [deletingMessageId, setDeletingMessageId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [leaving, setLeaving] = useState(false);

  // メッセージを最下部にスクロール
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // グループチャット一覧を取得
  const fetchGroupChats = useCallback(async () => {
    try {
      const res = await fetch('/api/group-chats');
      const data = await res.json();
      if (res.ok && data.groupChats) {
        setGroupChats(data.groupChats);
      }
    } catch (err) {
      // エラーは静かに無視
    }
  }, []);

  // メッセージを取得
  const fetchMessages = useCallback(async (groupChatId: string) => {
    try {
      const res = await fetch(`/api/group-chats?groupChatId=${groupChatId}`);
      const data = await res.json();
      if (res.ok && data.messages) {
        setMessages(data.messages);
      }
    } catch (err) {
      // エラーは静かに無視
    }
  }, []);

  // 初期データ取得
  useEffect(() => {
    const loadData = async () => {
      await fetchGroupChats();
      setLoading(false);
    };
    loadData();
  }, [currentUserId, fetchGroupChats]);

  // リアルタイム更新（ポーリング）
  useEffect(() => {
    if (selectedGroupChat) {
      // 選択中のグループチャットのメッセージを定期的に更新
      const interval = setInterval(() => {
        fetchMessages(selectedGroupChat.id);
        fetchGroupChats(); // グループチャット一覧も更新（未読数など）
      }, 2000); // 2秒ごと

      return () => {
        clearInterval(interval);
      };
    }
  }, [selectedGroupChat?.id, fetchMessages, fetchGroupChats]);

  // グループチャット選択
  const handleSelectGroupChat = (groupChat: GroupChatWithDetails) => {
    setSelectedGroupChat(groupChat);
    fetchMessages(groupChat.id);
    setShowCreateModal(false);
    
    // 確認済みタイムスタンプを記録
    const groupViewedData = localStorage.getItem('groupChatViewed');
    const viewed = groupViewedData ? JSON.parse(groupViewedData) : {};
    viewed[groupChat.id] = new Date().toISOString();
    localStorage.setItem('groupChatViewed', JSON.stringify(viewed));
    
    // 通知をリセットするためにイベントを発火
    window.dispatchEvent(new CustomEvent('chatViewed'));
  };

  // ユーザー検索（表示用IDで検索 - 左側のフォーム用）
  const handleSearchUserByPublicId = async () => {
    if (!searchPublicId.trim()) {
      setSearchedUser(null);
      return;
    }

    setSearching(true);
    try {
      const res = await fetch(`/api/users/search?publicId=${encodeURIComponent(searchPublicId.trim())}`);
      const data = await res.json();
      if (res.ok && data.user) {
        setSearchedUser(data.user);
      } else {
        setSearchedUser(null);
        alert(data.error || 'ユーザーが見つかりません');
      }
    } catch (err) {
      alert('ユーザー検索に失敗しました');
    } finally {
      setSearching(false);
    }
  };

  // ユーザー検索（ユーザー名で検索 - 右側の説明エリア用）
  const handleSearchUserByUsername = async () => {
    if (!rightSideSearchQuery.trim()) {
      setRightSideSearchedUsers([]);
      return;
    }

    setRightSideSearching(true);
    try {
      const res = await fetch(`/api/users/search?username=${encodeURIComponent(rightSideSearchQuery.trim())}`);
      const data = await res.json();
      if (res.ok && data.users) {
        setRightSideSearchedUsers(data.users);
      } else {
        setRightSideSearchedUsers([]);
        if (data.error) {
          alert(data.error);
        }
      }
    } catch (err) {
      alert('ユーザー検索に失敗しました');
      setRightSideSearchedUsers([]);
    } finally {
      setRightSideSearching(false);
    }
  };

  // 参加者を追加（左側のフォーム用）
  const handleAddParticipant = () => {
    if (searchedUser && searchedUser.publicId && !participantPublicIds.includes(searchedUser.publicId)) {
      setParticipantPublicIds([...participantPublicIds, searchedUser.publicId]);
      setParticipantUsers([...participantUsers, searchedUser]);
      setSearchPublicId('');
      setSearchedUser(null);
    }
  };

  // 参加者を追加（右側の説明エリア用 - 検索結果から左側のフォームに追加）
  const handleAddParticipantFromRightSide = (user: User) => {
    if (user && user.publicId && !participantPublicIds.includes(user.publicId)) {
      setParticipantPublicIds([...participantPublicIds, user.publicId]);
      setParticipantUsers([...participantUsers, user]);
      // 左側のフォームを表示するためにモーダルを開く
      setShowCreateModal(true);
    }
  };

  // 参加者を削除
  const handleRemoveParticipant = (index: number) => {
    setParticipantPublicIds(participantPublicIds.filter((_, i) => i !== index));
    setParticipantUsers(participantUsers.filter((_, i) => i !== index));
  };

  // グループチャット作成
  const handleCreateGroupChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) {
      alert('グループ名を入力してください');
      return;
    }

    const validPublicIds = participantPublicIds.filter(id => id.trim().length > 0);
    if (validPublicIds.length === 0) {
      alert('最低1人の参加者を追加してください');
      return;
    }

    setSending(true);
    try {
      const res = await fetch('/api/group-chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newGroupName,
          description: newGroupDescription || undefined,
          participantPublicIds: validPublicIds,
        }),
      });

      const data = await res.json();
      if (res.ok && data.groupChat) {
        await fetchGroupChats();
        setShowCreateModal(false);
        setNewGroupName('');
        setNewGroupDescription('');
        setParticipantPublicIds([]);
        setParticipantUsers([]);
        setSearchPublicId('');
        setSearchedUser(null);
        // 作成したグループチャットを選択
        const updated = await fetch('/api/group-chats').then(r => r.json());
        if (updated.groupChats) {
          const newGroup = updated.groupChats.find((gc: GroupChatWithDetails) => gc.id === data.groupChat.id);
          if (newGroup) {
            handleSelectGroupChat(newGroup);
          }
        }
      } else {
        alert(data.error || 'グループチャットの作成に失敗しました');
      }
    } catch (err) {
      alert('グループチャットの作成に失敗しました');
    } finally {
      setSending(false);
    }
  };

  // メッセージ送信
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageContent.trim() || !selectedGroupChat) return;

    setSending(true);
    try {
      const res = await fetch('/api/group-chats/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupChatId: selectedGroupChat.id,
          content: messageContent,
        }),
      });

      const data = await res.json();
      if (res.ok && data.message) {
        setMessageContent('');
        // メッセージを即座に追加（リアルタイム感を出す）
        setMessages([...messages, data.message]);
        // グループチャット一覧も更新
        await fetchGroupChats();
      } else {
        alert(data.error || 'メッセージの送信に失敗しました');
      }
    } catch (err) {
      alert('メッセージの送信に失敗しました');
    } finally {
      setSending(false);
    }
  };

  // 参加者追加
  const handleAddParticipantToGroup = async () => {
    if (!selectedGroupChat || !searchedUser) return;

    try {
      const res = await fetch('/api/group-chats', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupChatId: selectedGroupChat.id,
          action: 'addParticipant',
          participantPublicId: searchedUser.publicId,
        }),
      });

      const data = await res.json();
      if (res.ok && data.groupChat) {
        await fetchGroupChats();
        const updated = await fetch('/api/group-chats').then(r => r.json());
        if (updated.groupChats) {
          const updatedGroup = updated.groupChats.find((gc: GroupChatWithDetails) => gc.id === selectedGroupChat.id);
          if (updatedGroup) {
            setSelectedGroupChat(updatedGroup);
          }
        }
        setSearchPublicId('');
        setSearchedUser(null);
        alert('参加者を追加しました');
      } else {
        alert(data.error || '参加者の追加に失敗しました');
      }
    } catch (err) {
      alert('参加者の追加に失敗しました');
    }
  };

  // グループチャットから退出
  const handleLeaveGroupChat = async () => {
    if (!selectedGroupChat) return;

    if (!confirm('このグループチャットから退出しますか？')) {
      return;
    }

    setLeaving(true);
    try {
      const res = await fetch('/api/group-chats', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupChatId: selectedGroupChat.id,
          action: 'leave',
        }),
      });

      const data = await res.json();
      if (res.ok && data.left) {
        // グループチャット一覧を更新
        await fetchGroupChats();
        // 選択中のグループチャットをクリア
        setSelectedGroupChat(null);
        setMessages([]);
        alert('グループチャットから退出しました');
      } else {
        alert(data.error || '退出に失敗しました');
      }
    } catch (err) {
      alert('退出に失敗しました');
    } finally {
      setLeaving(false);
    }
  };

  const content = (
    <>
      {/* ヘッダー */}
      {!embedded && (
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowCreateModal(!showCreateModal)}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              {showCreateModal ? 'グループ一覧' : '新規グループ作成'}
            </button>
            {selectedGroupChat && !showCreateModal && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {selectedGroupChat.name}
                </h2>
                {selectedGroupChat.description && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {selectedGroupChat.description}
                  </p>
                )}
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  参加者: {selectedGroupChat.participants?.length || 0}人
                </p>
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
      {embedded && (
        <div className="flex items-center gap-4 p-4 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setShowCreateModal(!showCreateModal)}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            {showCreateModal ? 'グループ一覧' : '新規グループ作成'}
          </button>
          {selectedGroupChat && !showCreateModal && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {selectedGroupChat.name}
              </h2>
              {selectedGroupChat.description && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {selectedGroupChat.description}
                </p>
              )}
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                参加者: {selectedGroupChat.participants?.length || 0}人
              </p>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
          {/* サイドバー（グループ一覧 or 作成フォーム） */}
          <div className={`w-80 border-r border-gray-200 dark:border-gray-700 flex flex-col ${showCreateModal ? '' : 'hidden md:block'}`}>
            {showCreateModal ? (
              <div className="flex flex-col h-full overflow-hidden">
                <div className="p-4 flex-shrink-0">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">新規グループ作成</h3>
                </div>
                <form onSubmit={handleCreateGroupChat} className="flex flex-col h-full overflow-hidden">
                  <div className="flex-1 overflow-y-auto px-4 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        グループ名 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={newGroupName}
                        onChange={(e) => setNewGroupName(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                        placeholder="例: コラボプロジェクト"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        説明（任意）
                      </label>
                      <textarea
                        value={newGroupDescription}
                        onChange={(e) => setNewGroupDescription(e.target.value)}
                        rows={3}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                        placeholder="グループの説明を入力..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        参加者を追加（表示用IDで検索）
                      </label>
                      <div className="flex gap-2 mb-2">
                        <input
                          type="text"
                          value={searchPublicId}
                          onChange={(e) => setSearchPublicId(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleSearchUserByPublicId();
                            }
                          }}
                          className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                          placeholder="表示用IDを入力"
                        />
                        <button
                          type="button"
                          onClick={handleSearchUserByPublicId}
                          disabled={searching}
                          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
                        >
                          {searching ? '検索中...' : '検索'}
                        </button>
                      </div>
                      {searchedUser && (
                        <div className="mb-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                          <div className="flex items-center justify-between">
                            <div>
                              <Link
                                href={`/users/${searchedUser.id}`}
                                onClick={onClose}
                                className="block font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
                              >
                                {searchedUser.username}
                              </Link>
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                {creatorTypeLabels[searchedUser.creatorType as CreatorType]}
                              </div>
                              {searchedUser.publicId && (
                                <div className="text-xs text-gray-400 dark:text-gray-500">
                                  ID: {searchedUser.publicId}
                                </div>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={handleAddParticipant}
                              className="px-3 py-1 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                            >
                              追加
                            </button>
                          </div>
                        </div>
                      )}
                    {participantUsers.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">追加済みの参加者:</p>
                        <div className="max-h-48 overflow-y-auto space-y-2 pr-2">
                          {participantUsers.map((user, index) => {
                            // ユーザー名のフォントサイズを計算
                            const baseFontSize = 0.875; // 14px
                            const minFontSize = 0.5; // 8px
                            const usernameFontSize = user.username.length > 15 
                              ? Math.max(minFontSize, baseFontSize - (user.username.length - 15) * 0.02)
                              : baseFontSize;
                            
                            // IDのフォントサイズをユーザー名よりさらに小さく（70%のサイズ）
                            const idFontSize = user.publicId 
                              ? Math.max(0.4, usernameFontSize * 0.7)
                              : usernameFontSize;
                            
                            return (
                              <div key={index} className="flex items-start gap-2 p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                <div className="flex flex-col gap-1 min-w-0 flex-1" style={{ maxWidth: 'calc(100% - 3rem)' }}>
                                  <Link
                                    href={`/users/${user.id}`}
                                    onClick={onClose}
                                    className="font-medium text-indigo-600 dark:text-indigo-400 hover:underline whitespace-nowrap"
                                    style={{ fontSize: `${usernameFontSize}rem` }}
                                    title={user.username}
                                  >
                                    {user.username}
                                  </Link>
                                  {user.publicId && (
                                    <span 
                                      className="text-gray-500 dark:text-gray-400 whitespace-nowrap"
                                      style={{ fontSize: `${idFontSize}rem` }}
                                      title={`ID: ${user.publicId}`}
                                    >
                                      (ID: {user.publicId})
                                    </span>
                                  )}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveParticipant(index)}
                                  className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors flex-shrink-0 mt-0.5"
                                  style={{ minWidth: '2.5rem' }}
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    </div>
                  </div>
                  <div className="flex-shrink-0 p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                    <button
                      type="submit"
                      disabled={sending}
                      className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {sending ? '作成中...' : 'グループを作成'}
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="p-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">グループ一覧</h3>
                {loading ? (
                  <div className="text-center text-gray-500 dark:text-gray-400">読み込み中...</div>
                ) : groupChats.length === 0 ? (
                  <div className="text-center text-gray-500 dark:text-gray-400">グループがありません</div>
                ) : (
                  <div className="space-y-2">
                    {groupChats.map((gc) => (
                      <button
                        key={gc.id}
                        onClick={() => handleSelectGroupChat(gc)}
                        className={`w-full text-left p-3 rounded-lg transition-colors ${
                          selectedGroupChat?.id === gc.id
                            ? 'bg-purple-100 dark:bg-purple-900/30'
                            : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="font-medium text-gray-900 dark:text-white">
                            {gc.name}
                          </div>
                          {gc.unreadCount > 0 && (
                            <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1">
                              {gc.unreadCount > 9 ? '9+' : gc.unreadCount}
                            </span>
                          )}
                        </div>
                        {gc.lastMessage && (
                          <div className="text-sm text-gray-500 dark:text-gray-400 truncate mt-1">
                            {gc.lastMessage.senderUsername}: {gc.lastMessage.content}
                          </div>
                        )}
                        <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                          {gc.participants?.length || 0}人
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* メッセージエリア */}
          <div className="flex-1 flex flex-col">
            {selectedGroupChat ? (
              <>
                {/* 参加者一覧（ヘッダー下） */}
                <div className="p-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <span className="text-xs text-gray-500 dark:text-gray-400">参加者:</span>
                    {selectedGroupChat.participants?.map((p) => (
                      <Link
                        key={p.id}
                        href={`/users/${p.id}`}
                        onClick={onClose}
                        className="px-2 py-1 text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors"
                      >
                        {p.username}
                      </Link>
                    ))}
                    <div className="flex-1"></div>
                    <button
                      onClick={handleLeaveGroupChat}
                      disabled={leaving}
                      className="px-3 py-1 text-sm bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors disabled:opacity-50"
                    >
                      {leaving ? '退出中...' : '退出'}
                    </button>
                  </div>
                  <div className="flex gap-2">
                      <input
                        type="text"
                        value={searchPublicId}
                        onChange={(e) => setSearchPublicId(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleSearchUserByPublicId();
                          }
                        }}
                        className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                        placeholder="表示用IDで検索"
                      />
                      <button
                        onClick={handleSearchUserByPublicId}
                        disabled={searching}
                        className="px-3 py-1 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
                      >
                        検索
                      </button>
                      {searchedUser && (
                        <button
                          onClick={handleAddParticipantToGroup}
                          className="px-3 py-1 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                        >
                          追加
                        </button>
                      )}
                    </div>
                    {searchedUser && (
                      <div className="mt-2 p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                        <div className="text-sm">
                          <Link
                            href={`/users/${searchedUser.id}`}
                            onClick={onClose}
                            className="font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
                          >
                            {searchedUser.username}
                          </Link>
                          <span className="text-gray-500 dark:text-gray-400 ml-2">
                            {creatorTypeLabels[searchedUser.creatorType as CreatorType]}
                          </span>
                          <span className="text-xs text-gray-400 dark:text-gray-500 ml-2">
                            ID: {searchedUser.publicId}
                          </span>
                        </div>
                      </div>
                    )}
                </div>

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
                            {!isOwn && !isEditing && (
                              <Link
                                href={`/users/${message.senderId}`}
                                onClick={onClose}
                                className={`block text-xs mb-1 hover:underline ${isOwn ? 'text-purple-100' : 'text-indigo-600 dark:text-indigo-400'}`}
                              >
                                {message.senderUsername}
                              </Link>
                            )}
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
                                        const res = await fetch(`/api/group-chats/messages/${message.id}`, {
                                          method: 'PUT',
                                          headers: { 'Content-Type': 'application/json' },
                                          body: JSON.stringify({ content: editingContent }),
                                        });
                                        if (res.ok) {
                                          setEditingMessageId(null);
                                          setEditingContent('');
                                          fetchMessages(selectedGroupChat!.id);
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
                                    {!isOwn && message.readBy.length > 1 && (
                                      <span className="ml-2">既読 {message.readBy.length - 1}</span>
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
                              const res = await fetch(`/api/group-chats/messages/${deletingMessageId}`, {
                                method: 'DELETE',
                              });
                              if (res.ok) {
                                setDeletingMessageId(null);
                                fetchMessages(selectedGroupChat!.id);
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
              <div className="flex-1 flex p-8 gap-6">
                {/* 左側: グループチャットの作成方法の説明 */}
                <div className="flex-1 bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">グループチャットの作成方法</h3>
                  <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">
                    <div className="space-y-2">
                      <p className="font-medium">グループチャットを作成する手順:</p>
                      <ol className="list-decimal list-inside space-y-2 ml-2">
                        <li>左側の「新規グループ作成」ボタンをクリック</li>
                        <li>グループ名を入力（必須）</li>
                        <li>説明を入力（任意）</li>
                        <li>「参加者を追加（表示用IDで検索）」欄で表示用IDを検索、または右側の「ユーザーを検索」でユーザー名を検索</li>
                        <li>検索結果から参加者を追加</li>
                        <li>「グループを作成」ボタンをクリック</li>
                      </ol>
                    </div>
                    <div className="mt-4 p-3 bg-purple-50 dark:bg-purple-900/30 rounded-lg">
                      <p className="text-purple-700 dark:text-purple-300 font-medium">💡 ヒント</p>
                      <p className="text-purple-600 dark:text-purple-400 text-xs mt-1">
                        左側のフォームでは表示用IDで検索できます。右側の「ユーザーを検索」ではユーザー名で検索でき、検索結果から「追加」ボタンをクリックすると、左側のフォームに自動的に追加されます。複数の参加者を追加してからグループを作成できます。
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* 右側: ユーザー検索機能（ユーザー名で検索） */}
                <div className="flex-1 bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">ユーザーを検索</h3>
                  <div className="space-y-4">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={rightSideSearchQuery}
                        onChange={(e) => setRightSideSearchQuery(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleSearchUserByUsername();
                          }
                        }}
                        className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                        placeholder="ユーザー名を入力"
                      />
                      <button
                        onClick={handleSearchUserByUsername}
                        disabled={rightSideSearching}
                        className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
                      >
                        {rightSideSearching ? '検索中...' : '検索'}
                      </button>
                    </div>
                      {rightSideSearchedUsers.length > 0 && (
                        <div className="space-y-2 max-h-96 overflow-y-auto">
                          {rightSideSearchedUsers.map((user) => (
                            <div key={user.id} className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                              <div className="flex items-center justify-between">
                                <div>
                                  <Link
                                    href={`/users/${user.id}`}
                                    onClick={onClose}
                                    className="block font-medium text-indigo-600 dark:text-indigo-400 hover:underline text-lg"
                                  >
                                    {user.username}
                                  </Link>
                                  <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                    {creatorTypeLabels[user.creatorType as CreatorType]}
                                  </div>
                                  {user.publicId && (
                                    <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                      ID: {user.publicId}
                                    </div>
                                  )}
                                </div>
                                <button
                                  onClick={() => handleAddParticipantFromRightSide(user)}
                                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                                >
                                  追加
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      {rightSideSearchQuery.trim() && rightSideSearchedUsers.length === 0 && !rightSideSearching && (
                        <div className="text-center text-gray-500 dark:text-gray-400 py-4">
                          該当するユーザーが見つかりません
                        </div>
                      )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
    </>
  );

  if (embedded) {
    return <div className="h-full w-full flex flex-col bg-transparent">{content}</div>;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col">
        {content}
      </div>
    </div>
  );
}

