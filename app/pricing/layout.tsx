import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '料金プラン｜Creators Garden',
  description: 'Creators Gardenの料金プランをご紹介します。Seed Plan（無料）、Grow Plan、Bloom Planから選べる創作コミュニティサービスです。',
};

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

