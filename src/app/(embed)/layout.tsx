export const metadata = {
  title: "TokulyLive",
  description: "完璧で究極の配信プラットフォーム",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  return (
    <html lang="ja" style={{ width: "100%", height: "100%" }}>
      <body style={{ width: "100%", height: "100%" }}>
        <NextAuthProvider session={session}>{children}</NextAuthProvider>
      </body>
    </html>
  );
}
import { auth } from "@/auth";
import NextAuthProvider from "@/providers/NextAuth";
