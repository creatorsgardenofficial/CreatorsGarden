'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import A8Ad from '@/components/A8Ad';
import { Post, PostType, CreatorType, PostStatus, Announcement } from '@/types';
import { creatorTypeLabels } from '@/lib/creatorTypes';

export default function PostsPage() {
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [allPosts, setAllPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [bookmarkedPosts, setBookmarkedPosts] = useState<Set<string>>(new Set());
  const [user, setUser] = useState<any>(null);
  const [tagSearchQuery, setTagSearchQuery] = useState(''); // タグ検索用
  const [tagSearchMode, setTagSearchMode] = useState<'and' | 'or'>('and'); // AND/OR検索モード
  const [filters, setFilters] = useState({
    type: '' as PostType | '',
    creatorType: '' as CreatorType | '',
    status: '' as PostStatus | '',
    tags: [] as string[], // 複数タグ対応
    search: '', // ワード検索（タイトル・内容）
  });
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  useEffect(() => {
    fetchAllPosts();
    fetchUser();
    fetchBookmarkedPostIds();
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      const res = await fetch('/api/announcements?visibleOnly=true', { credentials: 'include' });
      const data = await res.json();
      if (res.ok) {
        setAnnouncements(data.announcements || []);
      }
    } catch (error) {
      // エラーは静かに無視（お知らせが表示されないだけ）
    }
  };

  const fetchUser = async () => {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      const data = await res.json();
      if (data.user) {
        setUser(data.user);
      }
    } catch (error) {
      // エラーは静かに無視
    }
  };

  const fetchBookmarkedPostIds = async () => {
    try {
      const res = await fetch('/api/bookmarks?postIds=true', { credentials: 'include' });
      const data = await res.json();
      if (data.postIds) {
        setBookmarkedPosts(new Set(data.postIds));
      }
    } catch (error) {
      // ログインしていない場合はエラーを無視
    }
  };

  // フィルターの変更を検知するためのメモ化された値
  const filterKey = useMemo(() => {
    return JSON.stringify({
      type: filters.type,
      creatorType: filters.creatorType,
      status: filters.status,
      tags: [...filters.tags].sort(), // 配列をコピーしてソートして安定化
      tagMode: tagSearchMode,
      search: filters.search,
    });
  }, [filters.type, filters.creatorType, filters.status, filters.tags, tagSearchMode, filters.search]);

  useEffect(() => {
    fetchPosts();
    setCurrentPage(1); // フィルター変更時は1ページ目に戻す
  }, [filterKey]); // メモ化されたキーを使用

  useEffect(() => {
    setCurrentPage(1); // 表示件数変更時は1ページ目に戻す
  }, [itemsPerPage]);

  const fetchAllPosts = async () => {
    const res = await fetch('/api/posts');
    const data = await res.json();
    setAllPosts(data.posts || []);
  };

  const fetchPosts = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.type) params.append('type', filters.type);
    if (filters.creatorType) params.append('creatorType', filters.creatorType);
    if (filters.status) params.append('status', filters.status);
    // 複数タグを送信
    filters.tags.forEach(tag => {
      params.append('tags', tag);
    });
    // タグ検索モードを送信
    if (filters.tags.length > 0) {
      params.append('tagMode', tagSearchMode);
    }
    // ワード検索を送信
    if (filters.search) {
      params.append('search', filters.search);
    }

    const res = await fetch(`/api/posts?${params.toString()}`);
    const data = await res.json();
    const fetchedPosts = data.posts || [];
    setPosts(fetchedPosts);
    
    // 各投稿のいいね状態を取得
    const likedSet = new Set<string>();
    await Promise.all(
      fetchedPosts.map(async (post: Post) => {
        try {
          const likeRes = await fetch(`/api/posts/${post.id}/like`);
          const likeData = await likeRes.json();
          if (likeData.isLiked) {
            likedSet.add(post.id);
          }
        } catch (error) {
          // エラーは静かに無視
        }
      })
    );
    setLikedPosts(likedSet);
    
    // ブックマーク状態を取得（ログインしている場合のみ）
    if (user) {
      await fetchBookmarkedPostIds();
    }
    
    setLoading(false);
  };

  // すべての投稿から使用されているタグを抽出（重複を除く）と使用頻度を計算
  const getAllTags = () => {
    const tagCountMap = new Map<string, number>();
    allPosts.forEach(post => {
      post.tags.forEach(tag => {
        tagCountMap.set(tag, (tagCountMap.get(tag) || 0) + 1);
      });
    });
    
    // 使用頻度順にソート（降順）、その後アルファベット順
    const sortedTags = Array.from(tagCountMap.entries())
      .sort((a, b) => {
        // まず使用頻度でソート（降順）
        if (b[1] !== a[1]) {
          return b[1] - a[1];
        }
        // 使用頻度が同じ場合はアルファベット順
        return a[0].localeCompare(b[0], 'ja');
      })
      .map(([tag]) => tag);
    
    return sortedTags;
  };

  // タグを検索クエリでフィルタリング
  const getFilteredTags = () => {
    const allTags = getAllTags();
    if (!tagSearchQuery.trim()) {
      // 検索していない場合は、よく使われる上位10個のみ表示
      return allTags.slice(0, 10);
    }
    // 検索している場合は、検索結果を表示（上限なし）
    const query = tagSearchQuery.toLowerCase();
    return allTags.filter(tag => tag.toLowerCase().includes(query));
  };

  // ページネーション計算
  const totalPages = Math.ceil(posts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentPosts = posts.slice(startIndex, endIndex);

  // ページ番号の配列を生成（最大5ページまで表示）
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxPagesToShow = 5;
    
    if (totalPages <= maxPagesToShow) {
      // 総ページ数が5以下なら全て表示
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // 現在のページが最初の方
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      }
      // 現在のページが最後の方
      else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i);
        }
      }
      // 現在のページが中間
      else {
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      }
    }
    
    return pages;
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

  const handleLike = async (e: React.MouseEvent, postId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      const res = await fetch(`/api/posts/${postId}/like`, {
        method: 'POST',
      });
      const data = await res.json();
      
      if (res.ok) {
        // 投稿のいいね状態を更新
        setPosts(prevPosts =>
          prevPosts.map(p =>
            p.id === postId
              ? { ...p, likes: data.post.likes }
              : p
          )
        );
        
        // いいね状態を更新
        if (data.isLiked) {
          setLikedPosts(prev => new Set(prev).add(postId));
        } else {
          setLikedPosts(prev => {
            const newSet = new Set(prev);
            newSet.delete(postId);
            return newSet;
          });
        }
      }
    } catch (error) {
      // エラーは静かに無視
    }
  };

  const handleBookmark = async (e: React.MouseEvent, postId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!user) {
      alert('ブックマークするにはログインが必要です');
      return;
    }
    
    try {
      const isBookmarked = bookmarkedPosts.has(postId);
      
      if (isBookmarked) {
        // ブックマーク削除
        const res = await fetch(`/api/bookmarks?postId=${postId}`, {
          method: 'DELETE',
          credentials: 'include',
        });
        
        if (res.ok) {
          setBookmarkedPosts(prev => {
            const newSet = new Set(prev);
            newSet.delete(postId);
            return newSet;
          });
        } else {
          const data = await res.json();
          alert(data.error || 'ブックマークの削除に失敗しました');
        }
      } else {
        // ブックマーク追加
        const res = await fetch('/api/bookmarks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ postId }),
        });
        
        const data = await res.json();
        
        if (res.ok) {
          setBookmarkedPosts(prev => new Set(prev).add(postId));
        } else {
          if (data.planLimit) {
            alert(data.error + '\nプランをアップグレードするには、プランページをご覧ください。');
          } else {
            alert(data.error || 'ブックマークの追加に失敗しました');
          }
        }
      }
    } catch (error) {
      // エラーは静かに無視
      alert('エラーが発生しました');
    }
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* お知らせ欄 */}
          {announcements.length > 0 && (
            <div className="mb-6 sm:mb-8 space-y-4">
              {announcements.map((announcement) => {
                const type = announcement.type || 'info';
                
                // タイプに応じたスタイル設定
                const styles = {
                  emergency: {
                    bg: 'bg-gradient-to-r from-yellow-50 via-orange-50 to-red-50 dark:from-yellow-900/30 dark:via-orange-900/30 dark:to-red-900/30',
                    border: 'border-l-8 border-red-500 dark:border-red-400',
                    iconColor: 'text-red-600 dark:text-red-400',
                    titleColor: 'text-red-700 dark:text-red-300',
                    shadow: '0 10px 25px -5px rgba(239, 68, 68, 0.3), 0 8px 10px -6px rgba(239, 68, 68, 0.2)',
                    icon: (
                      <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                      </svg>
                    ),
                    emoji: '🚨',
                    animate: 'animate-pulse',
                  },
                  maintenance: {
                    bg: 'bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/30 dark:to-amber-900/30',
                    border: 'border-l-8 border-orange-500 dark:border-orange-400',
                    iconColor: 'text-orange-600 dark:text-orange-400',
                    titleColor: 'text-orange-700 dark:text-orange-300',
                    shadow: '0 10px 25px -5px rgba(251, 146, 60, 0.3), 0 8px 10px -6px rgba(251, 146, 60, 0.2)',
                    icon: (
                      <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    ),
                    emoji: '🔧',
                    animate: '',
                  },
                  info: {
                    bg: 'bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30',
                    border: 'border-l-8 border-blue-500 dark:border-blue-400',
                    iconColor: 'text-blue-600 dark:text-blue-400',
                    titleColor: 'text-blue-700 dark:text-blue-300',
                    shadow: '0 10px 25px -5px rgba(59, 130, 246, 0.3), 0 8px 10px -6px rgba(59, 130, 246, 0.2)',
                    icon: (
                      <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                      </svg>
                    ),
                    emoji: '📢',
                    animate: '',
                  },
                  warning: {
                    bg: 'bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-900/30 dark:to-amber-900/30',
                    border: 'border-l-8 border-yellow-500 dark:border-yellow-400',
                    iconColor: 'text-yellow-600 dark:text-yellow-400',
                    titleColor: 'text-yellow-700 dark:text-yellow-300',
                    shadow: '0 10px 25px -5px rgba(234, 179, 8, 0.3), 0 8px 10px -6px rgba(234, 179, 8, 0.2)',
                    icon: (
                      <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    ),
                    emoji: '⚠️',
                    animate: 'animate-bounce',
                  },
                  success: {
                    bg: 'bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30',
                    border: 'border-l-8 border-green-500 dark:border-green-400',
                    iconColor: 'text-green-600 dark:text-green-400',
                    titleColor: 'text-green-700 dark:text-green-300',
                    shadow: '0 10px 25px -5px rgba(34, 197, 94, 0.3), 0 8px 10px -6px rgba(34, 197, 94, 0.2)',
                    icon: (
                      <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    ),
                    emoji: '✅',
                    animate: '',
                  },
                };
                
                const style = styles[type] || styles.info;
                
                return (
                  <div
                    key={announcement.id}
                    className={`relative ${style.bg} ${style.border} rounded-lg shadow-2xl p-5 sm:p-7 ${style.animate}`}
                    style={{
                      boxShadow: style.shadow,
                    }}
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex-1">
                        <h3 className={`text-xl sm:text-2xl font-extrabold ${style.titleColor} mb-3 flex items-center gap-2`}>
                          <span className="inline-block">{style.emoji}</span>
                          {announcement.title}
                        </h3>
                        <p className="text-base sm:text-lg text-gray-800 dark:text-gray-200 font-medium whitespace-pre-wrap leading-relaxed">
                          {announcement.content}
                        </p>
                      </div>
                    </div>
                    {/* 装飾的な波線 */}
                    {type === 'emergency' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-red-400 to-transparent opacity-50"></div>}
                    {type === 'maintenance' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-orange-400 to-transparent opacity-50"></div>}
                    {type === 'info' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-blue-400 to-transparent opacity-50"></div>}
                    {type === 'warning' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-yellow-400 to-transparent opacity-50"></div>}
                    {type === 'success' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-green-400 to-transparent opacity-50"></div>}
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white">
              投稿一覧
            </h1>
            <Link
              href="/posts/new"
              className="px-4 py-2 sm:px-6 sm:py-3 bg-indigo-600 text-white rounded-lg text-sm sm:text-base font-semibold hover:bg-indigo-700 transition-colors text-center"
            >
              新規投稿
            </Link>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 sm:p-6 mb-6 sm:mb-8">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-4">
              フィルター
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  投稿タイプ
                </label>
                <select
                  value={filters.type}
                  onChange={(e) => setFilters({ ...filters, type: e.target.value as PostType | '' })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                >
                  <option value="">すべて</option>
                  <option value="collab">コラボ募集</option>
                  <option value="idea">アイデア共有</option>
                  <option value="seeking">パートナー探し</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  クリエイタータイプ
                </label>
                <select
                  value={filters.creatorType}
                  onChange={(e) => setFilters({ ...filters, creatorType: e.target.value as CreatorType | '' })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                >
                  <option value="">すべて</option>
                  <option value="writer">小説家</option>
                  <option value="illustrator">イラストレーター</option>
                  <option value="mangaArtist">漫画家 / マンガ制作</option>
                  <option value="composer">作曲家 / ボカロP</option>
                  <option value="singer">歌手 / 歌い手</option>
                  <option value="voiceActor">声優 / ナレーター</option>
                  <option value="gameCreator">ゲームクリエイター</option>
                  <option value="videoCreator">動画編集者 / アニメーター</option>
                  <option value="artist3d">3Dモデラー</option>
                  <option value="live2dModeler">Live2D モデラー</option>
                  <option value="developer">Webエンジニア / プログラマー</option>
                  <option value="other">その他</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  ステータス
                </label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value as PostStatus | '' })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                >
                  <option value="">すべて</option>
                  <option value="open">メンバー募集中</option>
                  <option value="closed">メンバー決定</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  ワード検索
                </label>
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  placeholder="タイトル・内容で検索..."
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  タグ検索（複数選択可）
                </label>
                {filters.tags.length > 0 && (
                  <button
                    onClick={() => setFilters({ ...filters, tags: [] })}
                    className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium"
                  >
                    すべてクリア
                  </button>
                )}
              </div>

              {/* AND/OR検索モード切り替え */}
              {filters.tags.length > 0 && (
                <div className="mb-3 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                  <span className="text-sm text-gray-600 dark:text-gray-400">検索モード:</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setTagSearchMode('and')}
                      className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                        tagSearchMode === 'and'
                          ? 'bg-indigo-600 text-white shadow-md'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                      }`}
                    >
                      AND検索
                    </button>
                    <button
                      type="button"
                      onClick={() => setTagSearchMode('or')}
                      className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                        tagSearchMode === 'or'
                          ? 'bg-indigo-600 text-white shadow-md'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                      }`}
                    >
                      OR検索
                    </button>
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {tagSearchMode === 'and'
                      ? '（選択したすべてのタグを含む投稿）'
                      : '（選択したタグのいずれかを含む投稿）'}
                  </span>
                </div>
              )}
              
              {/* タグ検索入力 */}
              <div className="mb-3">
                <input
                  type="text"
                  placeholder="タグを検索..."
                  value={tagSearchQuery}
                  onChange={(e) => setTagSearchQuery(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white text-sm"
                />
              </div>

              {/* 選択されたタグを表示 */}
              {filters.tags.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-2">
                  {filters.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-600 text-white rounded-full text-sm font-medium shadow-sm"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                      #{tag}
                      <button
                        onClick={() => {
                          setFilters({ ...filters, tags: filters.tags.filter(t => t !== tag) });
                        }}
                        className="ml-1 hover:bg-indigo-700 rounded-full p-0.5 transition-colors"
                        aria-label={`${tag}を削除`}
                      >
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* タグ一覧 */}
              {getAllTags().length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 py-2">タグがありません</p>
              ) : (
                <div className="max-h-48 sm:max-h-64 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-2 sm:p-3 bg-gray-50 dark:bg-gray-800/50">
                  {getFilteredTags().length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                      「{tagSearchQuery}」に一致するタグが見つかりません
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {getFilteredTags().map((tag) => {
                        const isSelected = filters.tags.includes(tag);
                        return (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => {
                              if (isSelected) {
                                setFilters({ ...filters, tags: filters.tags.filter(t => t !== tag) });
                              } else {
                                setFilters({ ...filters, tags: [...filters.tags, tag] });
                              }
                            }}
                            className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                              isSelected
                                ? 'bg-indigo-600 text-white shadow-md hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600'
                                : 'bg-white text-gray-700 hover:bg-gray-100 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600'
                            }`}
                          >
                            {isSelected && (
                              <svg
                                className="w-4 h-4"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            )}
                            <span>#{tag}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block w-8 h-8 border-4 border-gray-300 border-t-indigo-600 rounded-full animate-spin"></div>
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl shadow-lg">
              <p className="text-gray-600 dark:text-gray-400">投稿がありません</p>
            </div>
          ) : (
            <>
              <div className="mb-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                  全{posts.length}件中 {startIndex + 1}〜{Math.min(endIndex, posts.length)}件を表示
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs sm:text-sm text-gray-700 dark:text-gray-300">
                    表示件数:
                  </label>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => setItemsPerPage(Number(e.target.value))}
                    className="px-2 py-1.5 sm:px-3 sm:py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white text-xs sm:text-sm"
                  >
                    <option value={10}>10件</option>
                    <option value={30}>30件</option>
                    <option value={50}>50件</option>
                    <option value={100}>100件</option>
                  </select>
                </div>
              </div>
         {/* 注目のアイデア枠（Grow Plan以上の投稿） */}
         {currentPosts.some(p => p.featuredDisplay) && (
           <div className="mb-6 sm:mb-8">
             <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-4">
               ⭐ 注目のアイデア
             </h2>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6" style={{ minWidth: 0 }}>
               {currentPosts
                 .filter(p => p.featuredDisplay)
                 .map((post) => (
                   <div key={post.id} className="min-w-0" style={{ minWidth: 0, maxWidth: '100%', overflow: 'hidden' }}>
                   <Link
                     href={`/posts/${post.id}`}
                     className="post-card-content block bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-xl shadow-lg p-4 sm:p-6 hover:shadow-xl transition-shadow border-2 border-yellow-300 dark:border-yellow-700 min-w-0"
                     style={{ minWidth: 0, maxWidth: '100%', overflow: 'hidden', wordBreak: 'break-all', overflowWrap: 'break-word', width: '100%', boxSizing: 'border-box' }}
                   >
                     <div className="mb-3 sm:mb-4 min-w-0" style={{ minWidth: 0, maxWidth: '100%', overflow: 'hidden' }}>
                       <div className="flex flex-wrap items-center gap-2 mb-2">
                         <span className="inline-block px-2 sm:px-3 py-1 bg-yellow-200 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200 rounded-full text-xs sm:text-sm font-semibold">
                           ⭐ 注目
                         </span>
                         <span className="inline-block px-2 sm:px-3 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300 rounded-full text-xs sm:text-sm font-semibold">
                           {postTypeLabels[post.type]}
                         </span>
                         <span className={`inline-block px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-semibold ${
                           post.status === 'open' 
                             ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' 
                             : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                         }`}>
                           {post.status === 'open' ? 'メンバー募集中' : 'メンバー決定'}
                         </span>
                       </div>
                       <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 dark:text-white mb-2 break-all overflow-wrap-anywhere min-w-0" style={{ wordBreak: 'break-all', overflowWrap: 'break-word', wordWrap: 'break-word', minWidth: 0, maxWidth: '100%', width: '100%' }}>
                         {post.title}
                       </h3>
                     </div>
                     
                     <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-3 sm:mb-4 line-clamp-3 break-all overflow-wrap-anywhere min-w-0" style={{ wordBreak: 'break-all', overflowWrap: 'break-word', wordWrap: 'break-word', minWidth: 0, maxWidth: '100%', width: '100%' }}>
                       {post.content}
                     </p>

                     {post.tags.length > 0 && (
                       <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-3 sm:mb-4">
                         {post.tags.map((tag) => (
                           <span
                             key={tag}
                             className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded text-xs"
                           >
                             #{tag}
                           </span>
                         ))}
                       </div>
                     )}

                     <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                       <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                         <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                           投稿者:{' '}
                           <span
                             onClick={(e) => {
                               e.stopPropagation();
                               router.push(`/users/${post.userId}`);
                             }}
                             className="text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                           >
                             {post.username}
                           </span>
                         </span>
                         <div className="flex items-center gap-2">
                           <button
                             onClick={(e) => handleLike(e, post.id)}
                             className={`flex items-center gap-1 px-2 sm:px-3 py-1 rounded-lg transition-colors ${
                               likedPosts.has(post.id)
                                 ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                                 : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                             }`}
                             title="いいね"
                           >
                             <svg
                               className="w-4 h-4 sm:w-5 sm:h-5"
                               fill={likedPosts.has(post.id) ? 'currentColor' : 'none'}
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
                             <span className="text-xs sm:text-sm font-medium">
                               {post.likes?.length || 0}
                             </span>
                           </button>
                           {user && (
                             <button
                               onClick={(e) => handleBookmark(e, post.id)}
                               className={`flex items-center gap-1 px-2 sm:px-3 py-1 rounded-lg transition-colors ${
                                 bookmarkedPosts.has(post.id)
                                   ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400'
                                   : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                               }`}
                               title={bookmarkedPosts.has(post.id) ? 'ブックマークを解除' : 'ブックマーク'}
                             >
                               <svg
                                 className="w-4 h-4 sm:w-5 sm:h-5"
                                 fill={bookmarkedPosts.has(post.id) ? 'currentColor' : 'none'}
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
                             </button>
                           )}
                         </div>
                       </div>
                       <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">{formatDate(post.createdAt)}</span>
                     </div>
                   </Link>
                   </div>
                 ))}
             </div>
           </div>
         )}

         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8" style={{ minWidth: 0 }}>
           {currentPosts
             .filter(p => !p.featuredDisplay) // 注目のアイデアは別枠で表示済み
             .map((post) => (
           <div key={post.id} className="min-w-0" style={{ minWidth: 0, maxWidth: '100%', overflow: 'hidden' }}>
           <Link
             href={`/posts/${post.id}`}
             className={`post-card-content block rounded-xl shadow-lg p-4 sm:p-6 hover:shadow-xl transition-shadow min-w-0 ${
               post.priorityDisplay 
                 ? 'bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-2 border-blue-300 dark:border-blue-700' 
                 : 'bg-white dark:bg-gray-800'
             }`}
             style={{ minWidth: 0, maxWidth: '100%', overflow: 'hidden', wordBreak: 'break-all', overflowWrap: 'break-word', width: '100%', boxSizing: 'border-box' }}
           >
                  <div className="mb-3 sm:mb-4 min-w-0" style={{ minWidth: 0, maxWidth: '100%', overflow: 'hidden' }}>
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="inline-block px-2 sm:px-3 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300 rounded-full text-xs sm:text-sm font-semibold">
                        {postTypeLabels[post.type]}
                      </span>
                      <span className={`inline-block px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-semibold ${
                        post.status === 'open' 
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' 
                          : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                      }`}>
                        {post.status === 'open' ? 'メンバー募集中' : 'メンバー決定'}
                      </span>
                    </div>
                    <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 dark:text-white mb-2 break-all overflow-wrap-anywhere min-w-0" style={{ wordBreak: 'break-all', overflowWrap: 'break-word', wordWrap: 'break-word', minWidth: 0, maxWidth: '100%', width: '100%' }}>
                      {post.title}
                    </h3>
                  </div>
                  
                  <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-3 sm:mb-4 line-clamp-3 break-all overflow-wrap-anywhere min-w-0" style={{ wordBreak: 'break-all', overflowWrap: 'break-word', wordWrap: 'break-word', minWidth: 0, maxWidth: '100%', width: '100%', whiteSpace: 'normal' }}>
                    {post.content}
                  </p>

                  {post.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-3 sm:mb-4">
                      {post.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded text-xs"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                      <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                        投稿者:{' '}
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/users/${post.userId}`);
                          }}
                          className="text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                        >
                          {post.username}
                        </span>
                        {' '}
                        <span className="inline-block px-2 sm:px-3 py-0.5 sm:py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-xs sm:text-sm">
                          {creatorTypeLabels[post.creatorType]}
                        </span>
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => handleLike(e, post.id)}
                          className={`flex items-center gap-1 px-2 sm:px-3 py-1 rounded-lg transition-colors ${
                            likedPosts.has(post.id)
                              ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                          }`}
                          title="いいね"
                        >
                          <svg
                            className="w-4 h-4 sm:w-5 sm:h-5"
                            fill={likedPosts.has(post.id) ? 'currentColor' : 'none'}
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
                          <span className="text-xs sm:text-sm font-medium">
                            {post.likes?.length || 0}
                          </span>
                        </button>
                        {user && (
                          <button
                            onClick={(e) => handleBookmark(e, post.id)}
                            className={`flex items-center gap-1 px-2 sm:px-3 py-1 rounded-lg transition-colors ${
                              bookmarkedPosts.has(post.id)
                                ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                            }`}
                            title={bookmarkedPosts.has(post.id) ? 'ブックマークを解除' : 'ブックマーク'}
                          >
                            <svg
                              className="w-4 h-4 sm:w-5 sm:h-5"
                              fill={bookmarkedPosts.has(post.id) ? 'currentColor' : 'none'}
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
                          </button>
                        )}
                      </div>
                    </div>
                    <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">{formatDate(post.createdAt)}</span>
                  </div>
                </Link>
                </div>
              ))}
              </div>

              {/* ページネーション */}
              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-1 sm:gap-2 mb-6 sm:mb-8 flex-wrap">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 sm:px-4 sm:py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm sm:text-base"
                  >
                    前へ
                  </button>
                  
                  {getPageNumbers().map((page, index) => (
                    page === '...' ? (
                      <span key={`ellipsis-${index}`} className="px-2 text-gray-500 dark:text-gray-400">
                        ...
                      </span>
                    ) : (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page as number)}
                        className={`px-3 py-1.5 sm:px-4 sm:py-2 border rounded-lg transition-colors text-sm sm:text-base ${
                          currentPage === page
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                      >
                        {page}
                      </button>
                    )
                  ))}
                  
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1.5 sm:px-4 sm:py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm sm:text-base"
                  >
                    次へ
                  </button>
                </div>
              )}

              {/* A8.net広告 */}
              <div className="mt-8 mb-6 flex justify-center">
                <A8Ad className="max-w-full" />
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

