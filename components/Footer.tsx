import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            © 2025 Creators Garden. All rights reserved.
          </div>
          <div className="flex flex-wrap justify-center gap-4 sm:gap-6 text-sm">
            <Link
              href="/terms"
              className="text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
            >
              利用規約
            </Link>
            <span className="text-gray-400 dark:text-gray-600">|</span>
            <Link
              href="/terms#privacy"
              className="text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
            >
              プライバシーポリシー
            </Link>
            <span className="text-gray-400 dark:text-gray-600">|</span>
            <Link
              href="/terms#community"
              className="text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
            >
              コミュニティガイドライン
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

