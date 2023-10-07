import './globals.css'
import Image from 'next/image';
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './tokuly-livestyle.css'; // スタイルシートをインポート
import icon from './tokuly.png';
import RecommendationCh from './recommendationCh';
const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'TokulyLive',
  description: '完璧で究極の配信プラットフォーム',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body className={inter.className}>
      <main>
    <div style={{ backgroundColor: 'rgb(240, 240, 240)',height: '100%' }}>
      <header>
        <div className="header">
          <a href="/"><Image src={icon} style={{ height: '50px',width:'50px', marginLeft: '30px', borderRadius: '10px', aspectRatio:'1/1' }} alt="Logo" /></a>
          <div className="header-contents"><a href="/" style={{ textDecoration: 'none' }}><p>配信中</p></a></div>
          {/*
          <div className="header-login"><a href="" style={{ textDecoration: 'none' }}><p style={{ paddingLeft: '14px' }}>ログイン</p></a></div>
          <div className="header-signup"><a href="" style={{ textDecoration: 'none' }}><p style={{ paddingLeft: '14px' }}>サインアップ</p></a></div>
          */}
          <div className="header-login"><a href="https://tokuly.com/studio" target='_blank' style={{ textDecoration: 'none' }}><p style={{ paddingLeft: '14px' }}>配信する</p></a></div>
          {/*
           <a href="/">
            <Image src={icon} style={{ height: '40px',width:'40px',borderRadius: '100px', marginRight:'10px' }} alt="Logo" />
           </a>
          */}
        </div>
      </header>
      {/* sidebar */}

      <div style={{ display:'flex',height: '100%'}}>
      <div className="sidebar">
        <div style={{ height: '75px' }}></div>
        <p style={{ fontWeight: '600', marginLeft: '15px', fontSize: '15px' }}>おすすめのチャンネル</p>
        <RecommendationCh />
      </div>
      {/* end-sidebar */}
      <div style={{overflowY: "scroll",width: '100%'}}>
        <div style={{height: "70px"}}></div>
        {children}
      </div>
    </div>
    </div>
    </main>
        </body>
    </html>
  )
}
