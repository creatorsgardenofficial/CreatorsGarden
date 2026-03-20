import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Footer from "@/components/Footer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Creators Garden｜異ジャンルコラボの専用コミュニティ",
  description: "Creators Gardenは、小説×イラスト×音楽など異ジャンル横断のコラボに特化したコミュニティです。pixivやXでは見つかりにくい、本気のパートナーを探したいクリエイターのための場所です。",
  keywords: ["クリエイター", "コラボ", "異ジャンルコラボ", "創作コミュニティ", "クリエイター交流", "コラボ募集", "パートナー探し", "創作プラットフォーム"],
  verification: {
    google: "tnvZBYxvA9j53zFrADBPbcq2tg_fgPYkRA7Q5cO-05U",
  },
  openGraph: {
    title: "Creators Garden｜異ジャンルコラボの専用コミュニティ",
    description: "小説×イラスト×音楽。分野を超えて、本気のパートナーを見つける。異ジャンル横断のコラボに特化したコミュニティです。",
    type: "website",
    locale: "ja_JP",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased flex flex-col min-h-screen`}
      >
        <div className="flex-1">
        {children}
        </div>
        <Footer />
      </body>
    </html>
  );
}
