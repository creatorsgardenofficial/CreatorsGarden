'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { User, PlanType } from '@/types';

export default function PricingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    // 決済成功/キャンセルメッセージの表示
    const success = searchParams.get('success');
    const canceled = searchParams.get('canceled');
    const sessionId = searchParams.get('session_id');
    
    if (success) {
      // 決済成功時はポーリングでユーザー情報を定期的に取得（Webhook処理の完了を待つ）
      let attempts = 0;
      const maxAttempts = 15; // 最大15回（30秒間）に増加
      
      // セッションIDがある場合、即座にサブスクリプションを確認
      const checkSessionSubscription = async () => {
        if (sessionId) {
          try {
            console.log('Checkout: セッションIDからサブスクリプションを確認', { sessionId });
            const res = await fetch(`/api/stripe/check-session?session_id=${sessionId}`, {
              credentials: 'include',
            });
            const data = await res.json();
            
            if (data.planUpdated) {
              // プランが更新された
              await fetchUser();
              setLoading(false);
              alert('決済が完了しました！プランが有効化されました。');
              router.replace('/pricing');
              return true;
            }
          } catch (error) {
            console.error('Checkout: セッション確認エラー', error);
          }
        }
        return false;
      };
      
      const pollUser = async () => {
        attempts++;
        
        // 最初の試行でセッションIDから確認
        if (attempts === 1 && sessionId) {
          const updated = await checkSessionSubscription();
          if (updated) return;
        }
        
        // プランが更新されたか確認（キャッシュを無効化）
        const res = await fetch('/api/auth/me', { 
          credentials: 'include',
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache',
          },
        });
        const data = await res.json();
        
        console.log(`Checkout: ポーリング試行 ${attempts}/${maxAttempts}`, {
          planType: data.user?.subscription?.planType,
          status: data.user?.subscription?.status,
        });
        
        if (data.user && data.user.subscription?.planType !== 'free' && data.user.subscription?.status === 'active') {
          // プランが更新された
          setUser(data.user);
          setLoading(false);
          alert('決済が完了しました！プランが有効化されました。');
          router.replace('/pricing');
        } else if (attempts < maxAttempts) {
          // まだ更新されていない場合、2秒後に再試行
          setTimeout(pollUser, 2000);
        } else {
          // 最大試行回数に達した場合
          setLoading(false);
          alert('決済は完了しましたが、プランの更新に時間がかかっています。数秒後にページをリロードしてください。\n\nローカル開発環境の場合は、Stripe CLIでWebhookを転送しているか確認してください。');
          router.replace('/pricing');
        }
      };
      
      // 最初のポーリングを開始（1秒後）
      setTimeout(pollUser, 1000);
    } else if (canceled) {
      alert('決済がキャンセルされました。');
      router.replace('/pricing');
    } else {
      // 通常の表示時はユーザー情報を取得（自動同期も試みる）
      fetchUser(true);
      
      // 定期的にユーザー情報をチェック（期限切れを検知するため）
      // 5分ごとにチェック（過度なリクエストを避ける）
      const intervalId = setInterval(() => {
        fetchUser(true);
      }, 5 * 60 * 1000); // 5分
      
      return () => clearInterval(intervalId);
    }
  }, [searchParams, router]);

  const fetchUser = async (autoSync = false) => {
    try {
      // キャッシュを無効化して最新のユーザー情報を取得
      const res = await fetch('/api/auth/me', { 
        credentials: 'include',
        cache: 'no-store', // キャッシュを無効化
        headers: {
          'Cache-Control': 'no-cache',
        },
      });
      const data = await res.json();
      if (res.ok && data.user) {
        const previousPlan = user?.subscription?.planType;
        setUser(data.user);
        console.log('User subscription updated:', data.user.subscription);
        
        // 自動同期が有効で、プランが変更された場合
        if (autoSync && previousPlan && previousPlan !== data.user.subscription?.planType) {
          console.log('AutoSync: プランが変更されました', {
            previous: previousPlan,
            current: data.user.subscription?.planType,
          });
        }
      }
    } catch (error) {
      console.error('Failed to fetch user:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (planType: PlanType) => {
    if (planType === 'free') {
      return;
    }

    // Grow Planは準備中のため、新規購入を拒否
    if (planType === 'grow') {
      const hasActiveGrowSubscription = user?.subscription?.planType === 'grow' && 
                                       user?.subscription?.status === 'active';
      if (!hasActiveGrowSubscription) {
        alert('Grow Plan（成長プラン）は現在準備中です。');
        return;
      }
    }

    setProcessing(true);
    try {
      const res = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ planType }),
      });

      // レスポンスをテキストとして読み込み、JSONとしてパースを試みる
      const text = await res.text();
      let data;
      
      try {
        data = JSON.parse(text);
      } catch (jsonError) {
        // JSONパースに失敗した場合（HTMLが返された可能性）
        console.error('JSON parse error:', jsonError);
        console.error('Response text (first 500 chars):', text.substring(0, 500));
        alert('サーバーエラーが発生しました。ページを再読み込みしてください。');
        return;
      }

      if (!res.ok) {
        alert(data.error || '決済セッションの作成に失敗しました');
        return;
      }

      // 既存のサブスクリプションを更新した場合（Webhookを待たない）
      if (data.planUpdated) {
        console.log('Checkout: プランが即座に更新されました');
        // ユーザー情報を再取得（キャッシュを無効化）
        setLoading(true);
        try {
          const res = await fetch('/api/auth/me', { 
            credentials: 'include',
            cache: 'no-store',
            headers: {
              'Cache-Control': 'no-cache',
            },
          });
          const userData = await res.json();
          if (res.ok && userData.user) {
            setUser(userData.user);
            console.log('Checkout: ユーザー情報を再取得しました', userData.user.subscription);
          }
        } catch (error) {
          console.error('Checkout: ユーザー情報の再取得に失敗', error);
        } finally {
          setLoading(false);
        }
        alert('プランが更新されました！');
        // ページをリロードせずにそのまま表示を更新
        return;
      }

      // Stripeチェックアウトページにリダイレクト
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Subscription error:', error);
      if (error instanceof SyntaxError) {
        alert('サーバーからの応答が正しくありません。ページを再読み込みしてください。');
      } else {
        alert('エラーが発生しました');
      }
    } finally {
      setProcessing(false);
    }
  };

  const handleManageSubscription = async () => {
    setProcessing(true);
    try {
      const res = await fetch('/api/stripe/create-portal', {
        method: 'POST',
        credentials: 'include',
      });

      // レスポンスをテキストとして読み込み、JSONとしてパースを試みる
      const text = await res.text();
      let data;
      
      try {
        data = JSON.parse(text);
      } catch (jsonError) {
        // JSONパースに失敗した場合（HTMLが返された可能性）
        console.error('JSON parse error:', jsonError);
        console.error('Response text (first 500 chars):', text.substring(0, 500));
        alert('サーバーエラーが発生しました。ページを再読み込みしてください。');
        return;
      }

      if (!res.ok) {
        alert(data.error || 'ポータルセッションの作成に失敗しました');
        return;
      }

      // Stripeカスタマーポータルにリダイレクト
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Portal error:', error);
      if (error instanceof SyntaxError) {
        alert('サーバーからの応答が正しくありません。ページを再読み込みしてください。');
      } else {
        alert('エラーが発生しました');
      }
    } finally {
      setProcessing(false);
    }
  };

  // ユーザー情報が更新されたら再レンダリング
  const currentPlan = user?.subscription?.planType || 'free';
  const isActive = user?.subscription?.status === 'active';
  
  // デバッグ用（開発環境のみ）
  if (process.env.NODE_ENV === 'development' && user) {
    console.log('Current user subscription:', user.subscription);
  }

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-gray-300 border-t-indigo-600 rounded-full animate-spin"></div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center mb-12">
            <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white mb-4">
              🌱 Creators Garden 各種プラン
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              あなたの創作活動を、もう一歩先へ。<br />
              もっと見つかりやすく、もっと繋がりやすいクリエイティブ体験を。
            </p>
          </div>

          {/* 現在のプラン表示 */}
          {user && (
            <div className="mb-8 text-center">
              <div className="inline-block px-6 py-3 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300 rounded-lg">
                <span className="font-semibold">現在のプラン: </span>
                {currentPlan === 'free' && '🟩 Free Plan（無料）'}
                {currentPlan === 'grow' && '🟦 Grow Plan（成長プラン）'}
                {currentPlan === 'bloom' && '🟪 Bloom Plan（開花プラン）'}
                {isActive && currentPlan !== 'free' && (
                  <span className="ml-2 text-sm">✓ アクティブ</span>
                )}
              </div>
              <div className="mt-4 flex justify-center gap-4">
                {isActive && currentPlan !== 'free' && (
                  <button
                    onClick={handleManageSubscription}
                    disabled={processing}
                    className="px-6 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
                  >
                    {processing ? '処理中...' : 'サブスクリプションを管理'}
                  </button>
                )}
                <button
                  onClick={async () => {
                    setLoading(true);
                    try {
                      // まずStripe APIから同期を試みる
                      if (user?.subscription?.stripeSubscriptionId) {
                        const syncRes = await fetch('/api/stripe/sync-subscription', {
                          method: 'POST',
                          credentials: 'include',
                        });
                        const syncData = await syncRes.json();
                        
                        if (syncData.success && syncData.updated) {
                          alert('プラン情報をStripeから同期しました！');
                        } else if (syncData.success) {
                          console.log('プラン情報は最新です');
                        } else {
                          console.warn('同期に失敗しましたが、続行します', syncData.error);
                        }
                      }
                    } catch (error) {
                      console.error('同期エラー:', error);
                      // エラーが発生しても、通常の更新は続行
                    }
                    // ユーザー情報を再取得
                    await fetchUser();
                  }}
                  disabled={loading}
                  className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
                >
                  {loading ? '更新中...' : 'プラン情報を更新'}
                </button>
              </div>
            </div>
          )}

          {/* プラン一覧 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Free Plan */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 border-2 border-green-200 dark:border-green-800">
              <div className="text-center mb-6">
                <div className="text-4xl mb-2">🟩</div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  Free Plan（無料）
                </h2>
                <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                  ¥0 <span className="text-lg text-gray-600 dark:text-gray-400">/ 月</span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  誰でも使える基本プラン。<br />
                  まずはあなたの"種"を植えてみましょう。
                </p>
              </div>

              <div className="mb-6">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                  ✓ 利用可能機能
                </h3>
                <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  <li>✓ 投稿（アイデア・コラボ募集・パートナー探し）</li>
                  <li>✓ コメント / いいね</li>
                  <li>✓ DM / グループチャット</li>
                  <li>✓ プロフィール作成</li>
                  <li>✓ タグ：3個まで</li>
                  <li>✓ ブックマーク：10件まで</li>
                </ul>
              </div>

              <div className="mb-6">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  こんな方におすすめ
                </h3>
                <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                  <li>• まずは気軽に使ってみたい</li>
                  <li>• 自分のアイデアをシェアしてみたい</li>
                  <li>• 少しずつ仲間を探したい</li>
                </ul>
              </div>

              <button
                disabled
                className="w-full px-6 py-3 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-lg font-semibold cursor-not-allowed"
              >
                {currentPlan === 'free' ? '現在のプラン' : '無料プランに戻る'}
              </button>
            </div>

            {/* Grow Plan - 準備中 */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 border-2 border-blue-300 dark:border-blue-700 opacity-60 relative">
              {currentPlan === 'grow' && isActive && (
                <div className="absolute top-4 right-4 px-3 py-1 bg-blue-600 text-white text-xs font-semibold rounded-full">
                  現在のプラン
                </div>
              )}
              <div className="text-center mb-6">
                <div className="text-4xl mb-2">🟦</div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  Grow Plan（成長プラン）
                </h2>
                <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                  準備中
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  あなたの投稿の「見つかりやすさ」と「つながりやすさ」を強化するライトプラン。
                </p>
              </div>

              <div className="mb-6">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                  🌟 特典内容
                </h3>
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white mb-1">
                      1. 投稿の優先表示
                    </p>
                    <ul className="space-y-1 text-gray-600 dark:text-gray-400 ml-2">
                      <li>• あなたの投稿が一覧の最上部に固定</li>
                      <li>• "注目のアイデア" 枠に掲載</li>
                      <li>• DMの返信率UP</li>
                    </ul>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white mb-1">
                      2. 拡張タグ（タグ10個まで）
                    </p>
                    <ul className="space-y-1 text-gray-600 dark:text-gray-400 ml-2">
                      <li>• 無料3→ 10タグまで</li>
                      <li>• 検索で見つかる確率が大幅UP</li>
                    </ul>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white mb-1">
                      3. ブックマーク無制限
                    </p>
                    <p className="text-gray-600 dark:text-gray-400 ml-2">
                      気になった投稿を自由に保存
                    </p>
                  </div>
                </div>
                <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                  ✓ 無料で使える機能もすべて利用可能
                </p>
              </div>

              <div className="mb-6">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  こんな方におすすめ
                </h3>
                <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                  <li>• 投稿の露出を増やしたい</li>
                  <li>• もっと多くのクリエイターに見てもらいたい</li>
                  <li>• 活発にコラボ相手を探したい</li>
                </ul>
              </div>

              <button
                disabled
                className="w-full px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-lg font-semibold cursor-not-allowed"
              >
                準備中
              </button>
            </div>

            {/* Bloom Plan - プレースホルダー */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 border-2 border-purple-300 dark:border-purple-700 opacity-60">
              <div className="text-center mb-6">
                <div className="text-4xl mb-2">🟪</div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  Bloom Plan（開花プラン）
                </h2>
                <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                  近日公開
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  さらに多くの機能を追加予定
                </p>
              </div>

              <button
                disabled
                className="w-full px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-lg font-semibold cursor-not-allowed"
              >
                準備中
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

