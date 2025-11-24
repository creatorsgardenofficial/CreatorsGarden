'use client';

import { useState } from 'react';
import DMChat from './DMChat';
import GroupChat from './GroupChat';

interface ChatPanelProps {
  currentUserId: string;
  onClose: () => void;
  initialTab?: 'dm' | 'group';
}

export default function ChatPanel({ currentUserId, onClose, initialTab = 'dm' }: ChatPanelProps) {
  const [activeTab, setActiveTab] = useState<'dm' | 'group'>(initialTab);

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 z-40 flex flex-col pointer-events-none" 
      style={{ top: '64px', height: 'calc(100vh - 64px)' }}
      onClick={(e) => {
        // 背景をクリックした場合は閉じる
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div 
        className="bg-white dark:bg-gray-800 rounded-t-lg shadow-xl w-full flex-1 flex flex-col min-h-0 pointer-events-auto" 
        style={{ height: '100%', maxHeight: '100%' }}
      >
        {/* ヘッダー - タブと閉じるボタン */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('dm')}
              className={`px-4 py-2 rounded-lg transition-colors font-medium ${
                activeTab === 'dm'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              DM
            </button>
            <button
              onClick={() => setActiveTab('group')}
              className={`px-4 py-2 rounded-lg transition-colors font-medium ${
                activeTab === 'group'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              グループチャット
            </button>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* コンテンツ */}
        <div className="flex-1 overflow-hidden relative min-h-0">
          {activeTab === 'dm' ? (
            <div className="h-full w-full min-h-0">
              <DMChat
                currentUserId={currentUserId}
                onClose={onClose}
                embedded={true}
              />
            </div>
          ) : (
            <div className="h-full w-full min-h-0">
              <GroupChat
                currentUserId={currentUserId}
                onClose={onClose}
                embedded={true}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

