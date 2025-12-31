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
  title: "Creators Garden｜クリエイターのための創作・コラボコミュニティ",
  description: "Creators Gardenは、クリエイター同士がつながり、創作・コラボレーション・作品発表を行えるオンラインコミュニティです。小説家、イラストレーター、作曲家、AIクリエイターなどが参加し、共同制作やアイデア共有の場として利用できます。",
  keywords: ["クリエイター", "コラボ", "創作コミュニティ", "クリエイター交流", "創作SNS", "コラボレーション", "創作プラットフォーム"],
  verification: {
    google: "tnvZBYxvA9j53zFrADBPbcq2tg_fgPYkRA7Q5cO-05U",
  },
  openGraph: {
    title: "Creators Garden｜クリエイターのための創作・コラボコミュニティ",
    description: "Creators Gardenは、クリエイター同士がつながり、創作・コラボレーション・作品発表を行えるオンラインコミュニティです。",
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
