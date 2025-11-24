import Link from 'next/link';
import Navbar from '@/components/Navbar';
import A8Ad from '@/components/A8Ad';

export default function Home() {
  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        {/* HEROセクション */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
          <div className="text-center mb-20">
            <div className="inline-block mb-6">
              <span className="text-6xl md:text-7xl">🌱</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6 leading-tight">
            クリエイターのための
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-green-500">
                コラボレーションプラットフォーム
              </span>
            </h1>
            <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 mb-10 max-w-3xl mx-auto leading-relaxed">
              小説家、イラストレーター、漫画家、作曲家、歌手、声優、ゲームクリエイター、動画編集者、3Dモデラー、Live2Dモデラー、Webエンジニアなど
              <br />
              様々なクリエイター同士が
              <br />
              アイデアを共有し、コラボレーションを見つける場所
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link
                href="/register"
                className="px-8 py-4 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-2xl text-lg font-semibold hover:from-purple-600 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-1"
              >
                今すぐ始める
              </Link>
              <Link
                href="/posts"
                className="px-8 py-4 bg-white dark:bg-gray-800 text-purple-600 dark:text-purple-400 rounded-2xl text-lg font-semibold border-2 border-purple-300 dark:border-purple-600 hover:bg-purple-50 dark:hover:bg-gray-700 transition-all shadow-md hover:shadow-lg"
              >
                投稿を見る
              </Link>
            </div>
          </div>

          {/* 3つのメリットカード */}
          <div className="grid md:grid-cols-3 gap-6 md:gap-8 mt-8 max-w-4xl mx-auto">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-2 border border-green-100 dark:border-green-900/30">
              <div className="text-5xl mb-4 text-center">🌱</div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3 text-center">
                アイデアの種を植える
              </h3>
              <p className="text-gray-600 dark:text-gray-300 text-center leading-relaxed">
                あなたのアイデアを投稿し、共感してくれるクリエイターを見つけましょう
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-2 border border-purple-100 dark:border-purple-900/30">
              <div className="text-5xl mb-4 text-center">🤝</div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3 text-center">
                コラボで芽を育てる
              </h3>
              <p className="text-gray-600 dark:text-gray-300 text-center leading-relaxed">
                一緒に作品を作りたいパートナーを探したり、コラボを募集できます
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-2 border border-yellow-100 dark:border-yellow-900/30">
              <div className="text-5xl mb-4 text-center">🌸</div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3 text-center">
                作品として花開く
              </h3>
              <p className="text-gray-600 dark:text-gray-300 text-center leading-relaxed">
                作品が芽吹き、磨き合いながら花開く――
              </p>
            </div>
          </div>
        </div>

        {/* 投稿タイプセクション */}
        <div className="bg-gradient-to-b from-white to-green-50/50 dark:from-gray-800 dark:to-gray-900 py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-6">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                投稿タイプ
              </h2>
              <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
                あなたの目的に合わせて、最適な投稿タイプを選んでください
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-6 md:gap-8">
              <Link
                href="/posts?type=idea"
                className="bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-900/20 dark:to-green-800/10 p-6 rounded-3xl shadow-md hover:shadow-xl transition-all transform hover:-translate-y-2 border-2 border-green-200 dark:border-green-800/50"
              >
                <div className="text-4xl mb-4 text-center">💡</div>
                <h3 className="text-xl font-bold text-green-900 dark:text-green-300 mb-3 text-center">
                  アイデア共有
                </h3>
                <p className="text-green-700 dark:text-green-400 text-center leading-relaxed">
                  自分のアイデアを共有し、フィードバックを得る
                </p>
              </Link>

              <Link
                href="/posts?type=collab"
                className="bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-900/20 dark:to-purple-800/10 p-6 rounded-3xl shadow-md hover:shadow-xl transition-all transform hover:-translate-y-2 border-2 border-purple-200 dark:border-purple-800/50"
              >
                <div className="text-4xl mb-4 text-center">🤝</div>
                <h3 className="text-xl font-bold text-purple-900 dark:text-purple-300 mb-3 text-center">
                  コラボ募集
                </h3>
                <p className="text-purple-700 dark:text-purple-400 text-center leading-relaxed">
                  一緒に作品を作りたいパートナーを探す
                </p>
              </Link>

              <Link
                href="/posts?type=seeking"
                className="bg-gradient-to-br from-yellow-50 to-yellow-100/50 dark:from-yellow-900/20 dark:to-yellow-800/10 p-6 rounded-3xl shadow-md hover:shadow-xl transition-all transform hover:-translate-y-2 border-2 border-yellow-200 dark:border-yellow-800/50"
              >
                <div className="text-4xl mb-4 text-center">🔍</div>
                <h3 className="text-xl font-bold text-yellow-900 dark:text-yellow-300 mb-3 text-center">
                  パートナー探し
                </h3>
                <p className="text-yellow-700 dark:text-yellow-400 text-center leading-relaxed">
                  特定のスキルを持つクリエイターを探す
                </p>
              </Link>
            </div>
          </div>
        </div>

        {/* ガーデンの世界観セクション */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center mb-6">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Creators Garden とは
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-3xl mx-auto leading-relaxed">
              Creators Gardenは、クリエイター同士が集まり、
              <br className="hidden md:block" />
              「アイデアの種」を投稿し、仲間と育てて「作品として花開かせる」ための
              <br className="hidden md:block" />
              創作者コミュニティサービスです。
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mt-12 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="inline-block bg-green-100 dark:bg-green-900/30 rounded-full p-6 mb-4">
                <span className="text-5xl">🌱</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                種を植える
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                アイデアを投稿する
              </p>
            </div>

            <div className="text-center">
              <div className="inline-block bg-purple-100 dark:bg-purple-900/30 rounded-full p-6 mb-4">
                <span className="text-5xl">🌿</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                芽が出る
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                共感や反応が生まれる
              </p>
            </div>

            <div className="text-center">
              <div className="inline-block bg-yellow-100 dark:bg-yellow-900/30 rounded-full p-6 mb-4">
                <span className="text-5xl">🌸</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                花が咲く
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                作品として完成する
              </p>
            </div>
          </div>
        </div>

        {/* A8.net広告 */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-center">
            <A8Ad className="max-w-full" />
          </div>
        </div>
      </div>
    </>
  );
}
