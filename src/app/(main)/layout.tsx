import "../globals.css";
import Image from "next/image";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./tokuly-livestyle.css"; // スタイルシートをインポート
import icon from "./tokuly.png";
import RecommendationCh from "./recommendationCh";
import { auth } from "../api/auth/[...nextauth]/route";
import AccountDropdownMenu from "./menu";
import type { Session } from "next-auth";
import Link from "next/link";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import LayoutContent from "./layout-content";
import Header from "@/components/header";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    template: "%s | Tokuly Live",
    absolute: "Tokuly Live",
  },
  metadataBase: new URL("htttps://live.tokuly.com"),
  description: "完璧で究極の配信プラットフォーム",
};

type Channels = {
  channels: Channel[];
};
type Channel = {
  name: string;
  icon_url: string;
  handle: string;
  now_stream: boolean;
  game: string;
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session: Session | null = await auth();
  const response = await fetch(
    "https://api.tokuly.com/live/channel/recommendation",
    { method: "POST", cache: "no-store" }
  );

  const channels: Channels = await response.json();

  return (
    <div style={{ backgroundColor: "rgb(240, 240, 240)", height: "100%" }}>
      <Header session={session} />
      <LayoutContent channels={channels}>{children}</LayoutContent>
    </div>
  );
}
