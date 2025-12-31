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
              最終更新日：2026年1月
            </p>

            <div className="prose prose-indigo dark:prose-invert max-w-none space-y-8">
              <section>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  本利用規約（以下「本規約」）は、Creators Garden（以下「本サービス」）の利用条件を定めるものです。
                </p>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  ユーザーは、本規約に同意した上で本サービスを利用するものとします。
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">第1条（適用）</h2>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  本規約は、本サービスを利用するすべてのユーザーに適用されます。
                </p>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  本サービスに関連して定めるコミュニティガイドライン、プライバシーポリシー、著作権およびAI生成物に関するポリシー等は、本規約の一部を構成します。
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">第2条（年齢制限）</h2>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  本サービスは、16歳以上のユーザーを対象とします。
                </p>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  18歳未満のユーザーは、金銭取引、契約行為、依頼の受注または発注等を、保護者の同意なく行ってはなりません。
                </p>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  年齢を偽って本サービスを利用したことにより生じたトラブルについて、運営者は一切責任を負いません。
                </p>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  18歳未満のユーザーが本サービスを利用した場合、保護者が本規約に同意したものとみなします。
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">第3条（アカウント管理）</h2>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  ユーザーは、登録情報について真実かつ正確な情報を提供するものとします。
                </p>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  同一ユーザーによる複数アカウントの不正利用を禁止します。
                </p>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  アカウントの管理責任はユーザー本人にあり、第三者による不正利用について、運営者は責任を負いません。
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">第4条（禁止事項）</h2>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                  ユーザーは、本サービスの利用にあたり、以下の行為を行ってはなりません。
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 ml-4">
                  <li>他者への誹謗中傷、脅迫、嫌がらせ、迷惑行為</li>
                  <li>著作権、商標権、肖像権、パブリシティ権その他第三者の権利を侵害する行為</li>
                  <li>性的、暴力的、差別的、反社会的な表現の投稿</li>
                  <li>詐欺行為、虚偽表示、未払い行為、金銭トラブルを生じさせる行為</li>
                  <li>スパム投稿、過度な宣伝行為、無断の外部サービス誘導</li>
                  <li>AI生成物の不正利用、他者作品を無断で学習させた生成物の投稿</li>
                  <li>法令または公序良俗に違反する行為</li>
                  <li>反社会的勢力への関与、またはこれに準ずる行為</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">第5条（投稿・メッセージの管理）</h2>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  運営者は、本サービス上の投稿、コメント、プロフィール内容等について、必要と判断した場合、事前の通知なく削除、非表示、アカウント停止等の措置を行うことがあります。
                </p>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  ダイレクトメッセージおよびグループチャットは、原則として運営者が内容を監視するものではありません。
                </p>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  ダイレクトメッセージや外部SNS（Discord、LINE、X 等）を通じて生じたトラブルについて、運営者は一切関与しません。
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">第6条（ユーザー間トラブルの免責）</h2>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                  ユーザー間で発生した以下のトラブルについては、当事者間で解決するものとします。
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 ml-4">
                  <li>コラボレーション、共同制作、契約不履行</li>
                  <li>金銭トラブル、報酬未払い</li>
                  <li>イラスト・作曲等の依頼に関するトラブル</li>
                  <li>依頼キャンセル、納品遅延、連絡断絶</li>
                  <li>著作権その他の権利紛争</li>
                  <li>外部SNSでの連絡、誹謗中傷、ストーカー行為</li>
                </ul>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed mt-4">
                  運営者は、仲裁、調停、証拠提出、法的手続きの代行を行いません。
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">第7条（著作権・知的財産権）</h2>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  本サービスに投稿されたコンテンツの著作権は、投稿者本人に帰属します。
                </p>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  ユーザーは、第三者の著作権、商標権、肖像権等を侵害するコンテンツを投稿してはなりません。
                </p>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  権利侵害の申し立てがあった場合、運営者は該当コンテンツの削除、非表示、アカウント停止等の措置を行うことができます。
                </p>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  著作権に関する紛争は、当事者間で解決するものとします。
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">第8条（AI生成物の取り扱い）</h2>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  AIツールによって生成されたコンテンツの投稿は可能とします。
                </p>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  AI生成物に関する著作権、肖像権、倫理的問題については、投稿者が一切の責任を負うものとします。
                </p>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  他者作品を無断で学習させたAIモデルによる生成物の投稿は禁止します。
                </p>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  AI生成物を人間の創作物であると偽る行為は禁止します。
                </p>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  AI生成物に関して生じた法的問題について、運営者は責任を負いません。
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">第9条（有料プランおよび決済）</h2>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  本サービスの有料プラン（Grow / Bloom）は、Stripe を利用して決済されます。
                </p>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  運営者は、クレジットカード情報を保持しません。
                </p>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  決済エラー、返金、カードトラブル等は、Stripe またはユーザーのカード会社との間で解決するものとします。
                </p>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  有料プランの途中解約による返金は行いません。
                </p>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  プランの変更および解約は、Stripe カスタマーポータルを通じて行うものとします。
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">第10条（サービスの変更・停止）</h2>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  運営者は、事前の通知なく本サービスの内容を変更、追加、または停止することがあります。
                </p>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  サーバー障害、データ消失、通信障害等について、運営者は責任を負いません。
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">第11条（免責事項）</h2>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  本サービスは、コラボレーションの成立、収益化、成果の達成を保証するものではありません。
                </p>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                  法令で認められる範囲において、運営者は以下の事項について責任を負いません。
                </p>
                <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 ml-4">
                  <li>投稿内容に起因する損害</li>
                  <li>ユーザー間トラブル</li>
                  <li>金銭、契約、AI生成物に関する紛争</li>
                  <li>データ消失、通信障害、システム不具合</li>
                  <li>外部サービス利用による損害</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">第12条（規約違反時の措置）</h2>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  運営者は、規約違反が認められた場合、事前通知なく投稿削除、アカウント停止、有料プランの解約等の措置を行うことがあります。
                </p>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  原則として、その理由の開示は行いません。
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">第13条（退会）</h2>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  ユーザーは、運営者が定める方法により、いつでも退会することができます。
                </p>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  退会後の投稿データの削除または保持については、運営者の裁量により決定されます。
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">第14条（規約変更）</h2>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  運営者は、本規約を随時変更できるものとし、変更後にユーザーが本サービスを利用した場合、当該変更に同意したものとみなします。
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-4">第15条（準拠法および管轄）</h2>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  本規約は、日本法を準拠法とします。
                </p>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  本サービスに関して生じた紛争については、運営者所在地を管轄する裁判所を第一審の専属的合意管轄とします。
                </p>
              </section>

              <section id="community" className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <span>🌱</span>
                  コミュニティガイドライン
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-6 italic">
                  本サービスは、クリエイター同士が安心して交流・協力できる場を目指しています。
                </p>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-semibold text-green-700 dark:text-green-400 mb-3">推奨される行為</h3>
                    <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 ml-4">
                      <li>建設的で敬意あるコミュニケーション</li>
                      <li>著作権およびクレジット表記の尊重</li>
                      <li>AI生成物である場合の明示（可能な範囲で）</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-red-700 dark:text-red-400 mb-3">禁止行為</h3>
                    <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 ml-4">
                      <li>他者を傷つける発言</li>
                      <li>性的・暴力的・不快な投稿</li>
                      <li>詐欺、勧誘、商材目的の利用</li>
                      <li>スカウトの偽装</li>
                      <li>外部SNSでの晒し行為</li>
                      <li>同一人物による複数アカウントの乱用</li>
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
                      <li>ユーザー名、プロフィール情報</li>
                      <li>投稿、コメント、ブックマーク</li>
                      <li>ダイレクトメッセージおよびグループチャットの送受信情報</li>
                      <li>Stripe による決済関連識別子（クレジットカード情報は保持しません）</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-2">2. 利用目的</h3>
                    <ul className="list-disc list-inside space-y-1 ml-4">
                      <li>本サービスの提供および運営</li>
                      <li>不正利用の防止およびセキュリティ確保</li>
                      <li>お問い合わせ対応</li>
                      <li>法令に基づく対応</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-2">3. 第三者提供</h3>
                    <p className="mb-2">以下の場合を除き、第三者に個人情報を提供しません。</p>
                    <ul className="list-disc list-inside space-y-1 ml-4">
                      <li>法令または裁判所命令に基づく場合</li>
                      <li>Stripe による決済処理に必要な範囲で提供する場合</li>
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-2">4. ダイレクトメッセージ</h3>
                    <p className="mb-2">
                      ダイレクトメッセージおよびグループチャットの内容は、原則として運営者が監視するものではありません。
                    </p>
                    <p>
                      ただし、法令に基づく要請があった場合に限り、必要な範囲で開示されることがあります。
                    </p>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-2">5. セキュリティ</h3>
                    <p className="mb-2">
                      運営者は、本サービスにおいて取り扱う個人情報およびユーザーデータについて、不正アクセス、情報漏洩、改ざん、滅失等を防止するため、合理的かつ適切なセキュリティ対策を講じるよう努めます。
                    </p>
                    <p className="mb-2">具体的には、以下のような対策を実施または検討しています。</p>
                    <ul className="list-disc list-inside space-y-1 ml-4">
                      <li>パスワード情報に対する適切な暗号化処理</li>
                      <li>Cookie に対するセキュリティ属性（HttpOnly 等）の設定</li>
                      <li>不正リクエストや不正操作を防止するための対策（CSRF 対策等）</li>
                      <li>不正利用の検知および調査を目的としたログの取得および管理</li>
                    </ul>
                    <p className="mt-2">
                      ただし、これらの対策は、すべての不正行為や情報漏洩を完全に防止することを保証するものではありません。
                    </p>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-2">6. 決済情報</h3>
                    <p>クレジットカード情報は Stripe が管理し、運営者は取得・保持しません。</p>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-2">7. プライバシーポリシーの変更</h3>
                    <p>本ポリシーは随時更新され、更新内容は本ページにて告知します。</p>
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

