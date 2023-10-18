import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import NextAuth, { type DefaultSession } from "next-auth";

interface Session {
  user: {
    id: string;
    createdAt: string;
    kids: boolean;
    prefectureId: null | number;
    updatedAt: string;
    image:string;
  } & DefaultSession["user"];
}
const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'TokulyLive',
  description: '完璧で究極の配信プラットフォーム',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body className={inter.className}>
        {children}
        </body>
    </html>
  )
}
