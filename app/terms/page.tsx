import Link from 'next/link';
import Navbar from '@/components/Navbar';

export default function TermsPage() {
  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 sm:p-8 md:p-12">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">
              Creators Garden 利用規約
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
              最終更新日：2025年1月
            </p>

            <div className="prose prose-indigo dark:prose-invert max-w-none space-y-8">
              <section>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  本利用規約（以下「本規約」）は、「Creators Garden」（以下「本サービス」）の利用条件を定めるものです。
                </p>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  ユーザーは本規約に同意した上で本サービスを利用するものとします。
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">第1条（適用）</h2>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  本規約は、本サービスを利用するすべてのユーザーに適用されます。
                </p>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  個別規定・ガイドライン・プライバシーポリシー・著作権ポリシー等は、本規約の一部を構成します。
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">第2条（年齢制限）</h2>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  本サービスは <strong>16歳以上</strong> を対象とします。
                </p>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  18歳未満のユーザーは、金銭取引、契約行為、依頼受注等を保護者の同意なしに行うことを禁止します。
                </p>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  年齢偽装により発生したトラブルについて、運営者は一切責任を負いません。
                </p>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  18歳未満のユーザーが利用する場合、保護者が本規約に同意したものとみなします。
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">第3条（アカウント）</h2>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  ユーザーは正確な情報を登録するものとします。
                </p>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  複数アカウントの悪用は禁止します。
                </p>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  アカウントの管理責任はユーザーにあり、第三者による利用について運営者は責任を負いません。
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">第4条（禁止事項）</h2>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                  ユーザーは以下の行為を行ってはなりません。
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 ml-4">
                  <li>他者への誹謗中傷、いやがらせ、迷惑行為</li>
                  <li>著作権・商標権・肖像権の侵害</li>
                  <li>性的・暴力的・差別的・反社会的な内容の投稿</li>
                  <li>金銭要求、依頼後の未払い、詐欺行為</li>
                  <li>スパム投稿、宣伝活動、外部サービスへの誘導</li>
                  <li>AI生成物の不正利用・他者作品学習データの無断使用</li>
                  <li>法令に違反する行為</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">第5条（投稿・メッセージの管理）</h2>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  投稿、コメント、プロフィール内容について、運営者は必要に応じて削除・非表示・アカウント停止等の措置を行うことがあります。
                </p>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  DMおよびグループチャットは運営者が監視しません。
                </p>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  DMや外部SNS（Discord、LINE、X など）で生じたトラブルについて、運営者は関与しません。
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">第6条（ユーザー間トラブルの免責）</h2>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                  ユーザー間の
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 ml-4">
                  <li>コラボ、共同制作、契約不履行</li>
                  <li>金銭トラブル</li>
                  <li>イラスト依頼・作曲依頼等の依頼トラブル</li>
                  <li>SNS外での連絡・暴言・ストーカー行為</li>
                  <li>著作権紛争</li>
                  <li>依頼キャンセル、納品遅延、連絡断絶</li>
                </ul>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed mt-4">
                  などは当事者同士で解決するものとし、運営者は一切責任を負いません。
                </p>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  運営者は 仲裁・調停・証拠提出・法的手続きの代行を行いません。
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">第7条（著作権・知的財産権）</h2>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  投稿や送信データの著作権は投稿者本人に帰属します。
                </p>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  他者の著作権・商標権・肖像権を侵害する投稿は禁止します。
                </p>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  他者からの権利侵害申し立てがあった場合、運営者は該当投稿の削除やアカウント停止を行う権限を持ちます。
                </p>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  著作権紛争は当事者間で解決するものとし、運営者は責任を負いません。
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">第8条（AI生成物の扱い）</h2>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  AIツールによる生成物は投稿可能ですが、権利関係の確認は投稿者が行うものとします。
                </p>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  AIモデルに他者作品を無断学習させた生成物の投稿は禁止します。
                </p>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  AI生成物を人間の創作物と偽る行為は禁止します。
                </p>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  AI生成物に関わる法的・倫理的問題について、運営者は一切責任を負いません。
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">第9条（サブスクリプション・Stripe決済）</h2>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  本サービスの有料プラン（Grow / Bloom）は Stripe を利用して決済を行います。
                </p>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  運営者はクレジットカード情報を保持しません。
                </p>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  決済エラー・返金・カードトラブル等は Stripe またはユーザーのカード会社との間で解決するものとします。
                </p>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  有料プランの途中解約に対する返金は行いません。
                </p>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  プラン変更・キャンセルはユーザー本人が Stripe カスタマーポータルから行うものとします。
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">第10条（サービスの提供・停止）</h2>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  運営者は事前告知なくサービス内容の変更・追加・停止が可能です。
                </p>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  サーバー障害・データ消失等について、運営者は責任を負いません。
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">第11条（免責事項：最強版）</h2>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                  運営者は以下について完全に免責されます。
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 ml-4">
                  <li>投稿内容による損害</li>
                  <li>コラボの破綻・依頼契約の不成立</li>
                  <li>DMや外部SNSでのトラブル</li>
                  <li>金銭トラブル・詐欺被害</li>
                  <li>AI生成物の権利トラブル</li>
                  <li>データ消失・通信障害・バグ</li>
                  <li>ユーザー間の争い・示談</li>
                  <li>炎上・SNS晒しによる被害</li>
                  <li>ユーザーが法的措置を取ることによる影響</li>
                </ul>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed mt-4">
                  ユーザーは運営者に損害賠償請求を行うことができません。
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">第12条（規約違反時の措置）</h2>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  運営者は、事前告知なしに投稿削除・アカウント停止・プラン強制解約を行うことがあります。
                </p>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  違反ユーザーへの理由開示義務は負いません。
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">第13条（規約変更）</h2>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  運営者は随時規約を変更することができ、変更後にユーザーがサービスを利用した場合、変更に同意したものとみなします。
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">第14条（準拠法・裁判管轄）</h2>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  本規約は日本法を準拠法とします。
                </p>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  紛争は運営者所在地を管轄する裁判所を第一審の専属的合意管轄とします。
                </p>
              </section>

              <section className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">著作権ポリシー</h2>
                <div className="space-y-3 text-gray-700 dark:text-gray-300">
                  <p>著作権を侵害する内容は投稿してはなりません。</p>
                  <p>著作権侵害が疑われる投稿に対し、運営者は削除・凍結を行うことがあります。</p>
                  <p>著作権者からの通報があった場合、運営者は通報に基づいて迅速に対応します。</p>
                  <p>ユーザーは著作権侵害のクレームが誤りであった場合、運営者に生じた損害を賠償するものとします。</p>
                  <p>著作権紛争は当事者間で解決し、運営者は仲裁しません。</p>
                </div>
              </section>

              <section className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">AI生成物ポリシー</h2>
                <div className="space-y-3 text-gray-700 dark:text-gray-300">
                  <p>AI生成物は投稿可能ですが、著作権・倫理的問題の責任は生成者本人が負います。</p>
                  <p>他者作品をAIに学習させた生成物（違法モデル）を投稿することは禁止します。</p>
                  <p>有名人の声・歌声をAIで模倣した場合、肖像権・パブリシティ権の問題は投稿者責任となります。</p>
                  <p>他者のデータを無断でAI学習させたり、商用利用する行為は禁止します。</p>
                  <p>運営者は AI 生成物の監視義務を負いません。</p>
                </div>
              </section>

              <section id="community" className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <span>🌱</span>
                  コミュニティガイドライン
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-4 italic">
                  利用規約より柔らかい「利用の心得」。
                </p>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-semibold text-green-700 dark:text-green-400 mb-3">✔ 行ってよいこと</h3>
                    <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 ml-4">
                      <li>建設的なフィードバック</li>
                      <li>コラボに興味を持ったユーザーを尊重する態度</li>
                      <li>互いの著作権を尊重</li>
                      <li>AI生成物の明示（可能なら）</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-red-700 dark:text-red-400 mb-3">❌ 禁止</h3>
                    <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 ml-4">
                      <li>他者を傷つける発言</li>
                      <li>性的・暴力的・不快な投稿</li>
                      <li>スカウト偽装・商材屋的な行為</li>
                      <li>クリエイターを騙す勧誘</li>
                      <li>金銭トラブルを誘発する行為</li>
                      <li>外部SNSでの晒し行為</li>
                      <li>同一ユーザーの複数アカウント乱用（禁止）</li>
                    </ul>
                  </div>
                </div>
              </section>

              <section id="privacy" className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <span>🔒</span>
                  プライバシーポリシー
                </h2>
                <div className="space-y-4 text-gray-700 dark:text-gray-300">
                  <div>
                    <h3 className="text-lg font-semibold mb-2">1. 取得する情報</h3>
                    <ul className="list-disc list-inside space-y-1 ml-4">
                      <li>メールアドレス</li>
                      <li>ユーザー名</li>
                      <li>プロフィール情報</li>
                      <li>投稿・コメント・ブックマーク</li>
                      <li>DM・グループチャットのメタデータ（内容は保存されるが非監視）</li>
                      <li>Stripeの決済関連ID（カード情報は保持しません）</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-2">2. 利用目的</h3>
                    <ul className="list-disc list-inside space-y-1 ml-4">
                      <li>サービス提供</li>
                      <li>不正利用の防止</li>
                      <li>セキュリティ確保</li>
                      <li>お問い合わせ対応</li>
                      <li>法律上必要な場合の開示</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-2">3. 第三者提供</h3>
                    <ul className="list-disc list-inside space-y-1 ml-4">
                      <li>法的要請・裁判所命令がある場合のみ提供</li>
                      <li>Stripe決済に必要な情報のみ Stripe に提供</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-2">4. DM/グループチャット</h3>
                    <p>非監視だが、法律上必要な場合のみ開示する場合があります。</p>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-2">5. セキュリティ</h3>
                    <ul className="list-disc list-inside space-y-1 ml-4">
                      <li>パスワードは bcrypt</li>
                      <li>Cookie は HttpOnly</li>
                      <li>CSRF 対策</li>
                      <li>セキュリティログ保持</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-2">6. プラン決済</h3>
                    <p>クレジットカード情報は Stripe が保管し、運営者は取得しません。</p>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-2">7. 規約更新</h3>
                    <p>更新時は本ページで告知</p>
                  </div>
                </div>
              </section>
            </div>

            <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700 text-center">
              <Link
                href="/"
                className="inline-block px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
              >
                トップページに戻る
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

