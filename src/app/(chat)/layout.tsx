import '../globals.css'
export const metadata = {
  title: 'TokulyLive',
  description: '完璧で究極の配信プラットフォーム',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja" style={{width: '100%', height: '100%'}}>
      <body style={{width: '100%', height: '100%'}}>{children}</body>
    </html>
  )
}
