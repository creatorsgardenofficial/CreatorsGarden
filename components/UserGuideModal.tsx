'use client';

interface UserGuideModalProps {
  onClose: () => void;
}

export default function UserGuideModal({ onClose }: UserGuideModalProps) {
  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <span className="text-3xl">📚</span>
            ユーザーガイド
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors p-2"
            aria-label="閉じる"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* コンテンツ */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-8">
            {/* はじめに */}
            <section>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <span className="text-2xl">🌱</span>
                Creators Gardenへようこそ
              </h3>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                Creators Gardenは、クリエイター同士が集まり、アイデアを共有し、コラボレーションを見つけるためのプラットフォームです。
                小説家、イラストレーター、漫画家、作曲家、歌手、声優、ゲームクリエイター、動画編集者、3Dモデラー、Live2Dモデラー、Webエンジニアなど、
                様々なクリエイターが利用しています。
              </p>
            </section>

            {/* 基本的な使い方 */}
            <section>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <span className="text-2xl">💡</span>
                基本的な使い方
              </h3>
              <div className="space-y-4">
                <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border-l-4 border-purple-500">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">1. 投稿を作成する</h4>
                  <p className="text-gray-700 dark:text-gray-300 text-sm">
                    「投稿する」ボタンから、アイデア共有・コラボ募集・パートナー探しの3種類の投稿を作成できます。
                    タイトル、内容、タグを設定して、あなたのアイデアや募集内容を投稿しましょう。
                  </p>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border-l-4 border-green-500">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">2. 投稿を閲覧する</h4>
                  <p className="text-gray-700 dark:text-gray-300 text-sm">
                    「投稿一覧」から、他のクリエイターの投稿を閲覧できます。
                    気になる投稿にブックマークを付けたり、コメントやメッセージで連絡を取ることができます。
                  </p>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border-l-4 border-blue-500">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">3. メッセージで連絡する</h4>
                  <p className="text-gray-700 dark:text-gray-300 text-sm">
                    チャットアイコンから、他のユーザーと直接メッセージのやり取りができます。
                    DM（ダイレクトメッセージ）とグループチャットの2種類があります。
                  </p>
                </div>
              </div>
            </section>

            {/* 投稿タイプについて */}
            <section>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <span className="text-2xl">📝</span>
                投稿タイプについて
              </h3>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                  <div className="text-3xl mb-2">💡</div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">アイデア共有</h4>
                  <p className="text-gray-700 dark:text-gray-300 text-sm">
                    自分のアイデアを共有し、フィードバックを得たい時に使用します。
                    他のクリエイターからの意見やアドバイスを集めることができます。
                  </p>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
                  <div className="text-3xl mb-2">🤝</div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">コラボ募集</h4>
                  <p className="text-gray-700 dark:text-gray-300 text-sm">
                    一緒に作品を作りたいパートナーを探す時に使用します。
                    プロジェクトの概要や必要なスキルを記載して、協力してくれるクリエイターを募集できます。
                  </p>
                </div>
                <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
                  <div className="text-3xl mb-2">🔍</div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">パートナー探し</h4>
                  <p className="text-gray-700 dark:text-gray-300 text-sm">
                    特定のスキルを持つクリエイターを探す時に使用します。
                    必要な専門性や経験を記載して、条件に合うクリエイターを見つけられます。
                  </p>
                </div>
              </div>
            </section>

            {/* プロフィール設定 */}
            <section>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <span className="text-2xl">👤</span>
                プロフィール設定
              </h3>
              <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-lg">
                <p className="text-gray-700 dark:text-gray-300 text-sm mb-3">
                  「マイページ」から、以下の情報を設定できます：
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 text-sm">
                  <li><strong>ユーザー名</strong>：他のユーザーに表示される名前</li>
                  <li><strong>クリエイタータイプ</strong>：あなたの専門分野（小説家、イラストレーターなど）</li>
                  <li><strong>自己紹介</strong>：あなたについての説明文（最大500文字）</li>
                  <li><strong>作品URL</strong>：ポートフォリオや作品ページのリンク（最大3つ）</li>
                </ul>
                <p className="text-gray-700 dark:text-gray-300 text-sm mt-3">
                  プロフィールを充実させることで、他のクリエイターとのコラボレーションの機会が増えます。
                </p>
              </div>
            </section>

            {/* ブックマーク機能 */}
            <section>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <span className="text-2xl">🔖</span>
                ブックマーク機能
              </h3>
              <div className="bg-pink-50 dark:bg-pink-900/20 p-4 rounded-lg">
                <p className="text-gray-700 dark:text-gray-300 text-sm">
                  気になる投稿をブックマークして、後で簡単にアクセスできます。
                  「マイページ」の自己紹介セクションから「ブックマーク」をクリックすると、ブックマークした投稿の一覧を確認できます。
                </p>
              </div>
            </section>

            {/* メッセージ機能 */}
            <section>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <span className="text-2xl">💬</span>
                メッセージ機能
              </h3>
              <div className="space-y-3">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">DM（ダイレクトメッセージ）</h4>
                  <p className="text-gray-700 dark:text-gray-300 text-sm">
                    1対1でメッセージのやり取りができます。他のユーザーのプロフィールページから直接メッセージを送ることができます。
                  </p>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">グループチャット</h4>
                  <p className="text-gray-700 dark:text-gray-300 text-sm">
                    複数のメンバーでグループチャットを作成できます。コラボレーションプロジェクトの打ち合わせなどに便利です。
                    投稿ページからグループチャットを作成することもできます。
                  </p>
                </div>
              </div>
            </section>

            {/* プランについて */}
            <section>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <span className="text-2xl">💎</span>
                プランについて
              </h3>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border-2 border-green-200 dark:border-green-800">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">🟩 Free Plan（無料）</h4>
                  <p className="text-gray-700 dark:text-gray-300 text-sm">
                    基本的な機能を無料で利用できます。投稿の作成、閲覧、メッセージの送受信などが可能です。
                  </p>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border-2 border-blue-200 dark:border-blue-800 opacity-75">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">🟦 Grow Plan（成長プラン）</h4>
                  <p className="text-gray-700 dark:text-gray-300 text-sm mb-2">
                    Free Planの機能に加えて、より多くの投稿や高度な機能を利用できます。
                  </p>
                  <p className="text-blue-600 dark:text-blue-400 text-sm font-semibold">
                    ⏳ 準備中
                  </p>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border-2 border-purple-200 dark:border-purple-800 opacity-75">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">🟪 Bloom Plan（開花プラン）</h4>
                  <p className="text-gray-700 dark:text-gray-300 text-sm mb-2">
                    すべての機能をフルに利用できます。最上位プランで、最大限の機能を活用できます。
                  </p>
                  <p className="text-purple-600 dark:text-purple-400 text-sm font-semibold">
                    ⏳ 準備中
                  </p>
                </div>
              </div>
              <p className="text-gray-700 dark:text-gray-300 text-sm mt-4">
                「マイページ」から現在のプランを確認し、「プランを確認」または「プランを管理」ボタンからプランの詳細や変更ができます。
              </p>
            </section>

            {/* ご意見箱 */}
            <section>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <span className="text-2xl">📮</span>
                ご意見箱
              </h3>
              <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
                <p className="text-gray-700 dark:text-gray-300 text-sm">
                  サービスに関するご意見、ご要望、不具合の報告など、お気軽にお寄せください。
                  ナビゲーションバーの「ご意見箱」から送信できます。管理者が確認し、必要に応じて返信いたします。
                </p>
              </div>
            </section>

            {/* よくある質問 */}
            <section>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <span className="text-2xl">❓</span>
                よくある質問
              </h3>
              <div className="space-y-4">
                <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Q. 投稿を編集・削除できますか？</h4>
                  <p className="text-gray-700 dark:text-gray-300 text-sm">
                    A. はい、自分が作成した投稿は編集・削除が可能です。投稿詳細ページから編集・削除ボタンをクリックしてください。
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Q. 投稿を「挙げる」とは何ですか？</h4>
                  <p className="text-gray-700 dark:text-gray-300 text-sm">
                    A. 投稿を「挙げる」ことで、投稿一覧の上位に表示されます。24時間に1回まで可能です。
                    より多くのクリエイターにあなたの投稿を見てもらうことができます。
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Q. 表示用IDとは何ですか？</h4>
                  <p className="text-gray-700 dark:text-gray-300 text-sm">
                    A. 表示用IDは、他のユーザーにあなたを識別してもらうためのIDです。
                    プロフィールページのURLや、他のユーザーを検索する際に使用できます。
                  </p>
                </div>
              </div>
            </section>

            {/* 最後のメッセージ */}
            <section className="bg-gradient-to-r from-purple-50 to-green-50 dark:from-purple-900/20 dark:to-green-900/20 p-6 rounded-lg border-2 border-purple-200 dark:border-purple-800">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3 text-center">
                🌸 素晴らしいコラボレーションを！
              </h3>
              <p className="text-gray-700 dark:text-gray-300 text-center leading-relaxed">
                Creators Gardenで、あなたのアイデアが芽吹き、他のクリエイターとのコラボレーションを通じて
                素晴らしい作品として花開くことを願っています。
                何かご不明な点がございましたら、お気軽にご意見箱までお問い合わせください。
              </p>
            </section>
          </div>
        </div>

        {/* フッター */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}

