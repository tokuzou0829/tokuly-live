import '../globals.css'
import Image from 'next/image';
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './tokuly-livestyle.css'; // スタイルシートをインポート
import icon from './tokuly.png';
import RecommendationCh from './recommendationCh';
import { auth } from '../api/auth/[...nextauth]/route'
import AccountDropdownMenu from './menu';
import { useRouter } from "next/router";
import NextAuth, { type Session } from "next-auth";
import Link from 'next/link';

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: {
    template: '%s | Tokuly Live',
    absolute: 'Tokuly Live',
  },
  description: '完璧で究極の配信プラットフォーム',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session:Session | null  = await auth();
  return (
    <div style={{ backgroundColor: 'rgb(240, 240, 240)',height: '100%' }}>
      <header>
        <div className="header">
          <Link href="/"><Image src={icon} style={{ height: '50px',width:'50px', marginLeft: '30px', borderRadius: '10px', aspectRatio:'1/1' }} alt="Logo" /></Link>
          <div className="header-contents"><Link href="/" style={{ textDecoration: 'none' }}><p>配信中</p></Link></div>
          {/*
          <div className="header-login"><a href="" style={{ textDecoration: 'none' }}><p style={{ paddingLeft: '14px' }}>ログイン</p></a></div>
          <div className="header-signup"><a href="" style={{ textDecoration: 'none' }}><p style={{ paddingLeft: '14px' }}>サインアップ</p></a></div>
          <div className="header-login"><a href="https://tokuly.com/studio" target='_blank' style={{ textDecoration: 'none' }}><p style={{ paddingLeft: '14px' }}>配信する</p></a></div>
           <a href="/">
            <Image src={icon} style={{ height: '40px',width:'40px',borderRadius: '100px', marginRight:'10px' }} alt="Logo" />
           </a>
          */}
          <div style={{marginRight: '10px',marginLeft:'auto'}}>
              <AccountDropdownMenu session={session}></AccountDropdownMenu>
           </div>
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
  )
}
