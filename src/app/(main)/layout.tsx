import "../globals.css";
import type { Metadata } from "next";
import "./tokuly-livestyle.css"; // スタイルシートをインポート
import { auth } from "../api/auth/[...nextauth]/route";
import LayoutContent from "./layout-content";
import Header from "@/components/header";
import { getRecommendChannel } from "@/requests/channel";

export const revalidate = 0;

export const metadata: Metadata = {
  title: {
    template: "%s | Tokuly Live",
    absolute: "Tokuly Live",
  },
  metadataBase: new URL("htttps://live.tokuly.com"),
  description: "完璧で究極の配信プラットフォーム",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [session, channels] = await Promise.all([
    auth(),
    getRecommendChannel(),
  ]);

  return (
    <div>
      <Header session={session} />
      <LayoutContent channels={channels}>{children}</LayoutContent>
    </div>
  );
}
