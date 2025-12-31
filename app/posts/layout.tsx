import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '投稿一覧｜Creators Garden',
  description: 'Creators Gardenの投稿一覧です。クリエイターのアイデア共有、コラボ募集、パートナー探しなどの投稿を閲覧できます。',
};

export default function PostsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

