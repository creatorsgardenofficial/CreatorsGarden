'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { Event } from '@/types';
import { creatorTypeLabels } from '@/lib/creatorTypes';

export default function EventsPage() {
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [likedEvents, setLikedEvents] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchEvents();
    fetchUser();
  }, []);

  const fetchUser = async () => {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      const data = await res.json();
      if (data.user) {
        setUser(data.user);
        // イイね済みイベントを取得
        const liked = events.filter(e => e.likes.includes(data.user.id)).map(e => e.id);
        setLikedEvents(new Set(liked));
      }
    } catch (error) {
      // エラーは静かに無視
    }
  };

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/events');
      const data = await res.json();
      if (res.ok && data.events) {
        setEvents(data.events);
        // ユーザーがログインしている場合、イイね済みイベントを更新
        if (user) {
          const liked = data.events.filter((e: Event) => e.likes.includes(user.id)).map((e: Event) => e.id);
          setLikedEvents(new Set(liked));
        }
      }
    } catch (error) {
      } finally {
      setLoading(false);
    }
  };

  const handleLike = async (eventId: string) => {
    if (!user) {
      alert('ログインが必要です');
      return;
    }

    try {
      const res = await fetch(`/api/events/${eventId}/like`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      if (res.ok && data.event) {
        setEvents(events.map(e => e.id === eventId ? data.event : e));
        if (data.event.likes.includes(user.id)) {
          setLikedEvents(new Set([...likedEvents, eventId]));
        } else {
          const newLiked = new Set(likedEvents);
          newLiked.delete(eventId);
          setLikedEvents(newLiked);
        }
      } else {
        alert(data.error || 'イイねに失敗しました');
      }
    } catch (error) {
      alert('イイねに失敗しました');
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">イベント一覧</h1>
          {user && (
            <Link
              href="/events/new"
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              イベントを投稿
            </Link>
          )}
        </div>

        {events.length === 0 ? (
          <div className="text-center text-gray-500 dark:text-gray-400 py-12">
            イベントがありません
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {events.map((event) => {
              const isLiked = user && likedEvents.has(event.id);
              const isExpired = isEventExpired(event.endDate);
              
              return (
                <div
                  key={event.id}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                        {event.name}
                      </h3>
                      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-2">
                        <span>{formatDate(event.startDate)}</span>
                        <span>〜</span>
                        <span>{formatDate(event.endDate)}</span>
                      </div>
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
                          event.status === 'open' && !isExpired
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                            : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                        }`}
                      >
                        {event.status === 'open' && !isExpired ? 'open' : 'close'}
                      </span>
                    </div>
                  </div>

                  <p className="text-gray-600 dark:text-gray-400 mb-4 line-clamp-3">
                    {event.content}
                  </p>

                  {event.urls && event.urls.length > 0 && (
                    <div className="mb-4 space-y-2">
                      {event.urls.map((urlData, index) => (
                        <a
                          key={index}
                          href={urlData.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-sm text-indigo-600 dark:text-indigo-400 hover:underline truncate"
                        >
                          {urlData.description || urlData.url}
                        </a>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => handleLike(event.id)}
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
                      <Link
                        href={`/events/${event.id}`}
                        className="text-indigo-600 dark:text-indigo-400 hover:underline"
                      >
                        詳細を見る
                      </Link>
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
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

