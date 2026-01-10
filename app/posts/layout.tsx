import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '投稿一覧｜Creators Garden',
  description: 'Creators Gardenの投稿一覧です。クリエイターの作品紹介、コラボ募集、パートナー探しなどの投稿を閲覧できます。',
};

export default function PostsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

