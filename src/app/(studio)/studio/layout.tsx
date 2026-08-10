import type { Metadata } from "next";
import { auth } from "@/auth";
import { requireStudioContext } from "@/lib/studio-context";
import NextAuthProvider from "@/providers/NextAuth";
import StudioShell from "./studio-shell";
import "./studio.css";

export const metadata: Metadata = {
  title: { default: "Tokuly Studio", template: "%s | Tokuly Studio" },
  description: "Tokulyのチャンネル、ライブ配信、動画を管理します。",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function StudioLayout({ children }: { children: React.ReactNode }) {
  const [session, context] = await Promise.all([auth(), requireStudioContext()]);
  return (
    <NextAuthProvider session={session}>
      <StudioShell channels={context.channels} channel={context.channel}>
        {children}
      </StudioShell>
    </NextAuthProvider>
  );
}
