"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { StudioChannel } from "@/types/studio";
import {
  Check,
  ChevronDown,
  Gift,
  LayoutDashboard,
  Menu,
  MessageSquare,
  Radio,
  Settings,
  Upload,
  Video,
  X,
} from "lucide-react";
import { signOut } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { selectStudioChannel } from "./actions";
import StudioCreateMenu from "./components/studio-create-menu";

const links = [
  { href: "/studio", label: "ダッシュボード", icon: LayoutDashboard },
  { href: "/studio/content", label: "コンテンツ", icon: Video },
  { href: "/studio/streams/new", label: "ライブ配信を作成", icon: Radio },
  { href: "/studio/videos/new", label: "動画をアップロード", icon: Upload },
  { href: "/studio/gifts", label: "ギフト", icon: Gift },
  { href: "/studio/chat-embed", label: "チャット埋め込み", icon: MessageSquare },
  { href: "/studio/channel", label: "チャンネル設定", icon: Settings },
];

function StudioAccountMenu({
  channels,
  channel,
}: {
  channels: StudioChannel[];
  channel: StudioChannel;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="h-11 gap-2 px-2"
          aria-label="チャンネルとアカウントを切り替える"
        >
          {channel.icon_url ? (
            <img src={channel.icon_url} alt="" className="h-8 w-8 rounded-full object-cover" />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--studio-fg)] text-xs font-bold text-[var(--studio-surface)]">
              {channel.name.slice(0, 1)}
            </div>
          )}
          <span className="hidden max-w-40 truncate text-sm font-semibold sm:block">
            {channel.name}
          </span>
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel>
          <p className="text-xs font-normal text-muted-foreground">管理するチャンネル</p>
        </DropdownMenuLabel>
        {channels.map((item) => (
          <DropdownMenuItem key={item.id} asChild>
            <form action={selectStudioChannel} className="w-full">
              <button
                name="channel_id"
                value={item.id}
                className="flex w-full items-center gap-3 py-1 text-left"
              >
                {item.icon_url ? (
                  <img src={item.icon_url} alt="" className="h-8 w-8 rounded-full object-cover" />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--studio-fg)] text-xs font-bold text-[var(--studio-surface)]">
                    {item.name.slice(0, 1)}
                  </div>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{item.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    @{item.handle}
                  </span>
                </span>
                {item.id === channel.id && <Check className="h-4 w-4" aria-label="選択中" />}
              </button>
            </form>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/">Studioを閉じる</Link>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => void signOut({ callbackUrl: "/" })}>
          ログアウト
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function StudioShell({
  children,
  channels,
  channel,
}: {
  children: React.ReactNode;
  channels: StudioChannel[];
  channel: StudioChannel;
}) {
  const pathname = usePathname() ?? "/studio";
  const [open, setOpen] = useState(false);

  if (pathname.startsWith("/studio/stream/browser-encoder")) return <>{children}</>;

  return (
    <div className="studio-theme min-h-screen bg-[var(--studio-bg)] text-[var(--studio-fg)]">
      <header className="fixed inset-x-0 top-0 z-40 flex h-16 items-center border-b border-[var(--studio-border)] bg-[var(--studio-surface)] px-4">
        <Button
          variant="ghost"
          size="icon"
          className="mr-2 lg:hidden"
          onClick={() => setOpen((value) => !value)}
          aria-label="メニューを開く"
        >
          {open ? <X /> : <Menu />}
        </Button>
        <Link href="/studio" className="flex min-w-0 items-center gap-3">
          <Image src="/tokuly.png" alt="Tokuly" width={38} height={38} className="rounded-lg" />
          <span className="hidden text-lg font-bold tracking-tight sm:inline">Tokuly Studio</span>
        </Link>
        <div className="ml-auto flex items-center gap-2">
          <StudioCreateMenu variant="icon" />
          <StudioAccountMenu channels={channels} channel={channel} />
        </div>
      </header>

      {open && (
        <button
          className="fixed inset-0 z-20 bg-black/40 lg:hidden"
          onClick={() => setOpen(false)}
          aria-label="メニューを閉じる"
        />
      )}
      <aside
        className={`fixed bottom-0 left-0 top-16 z-30 w-64 border-r border-[var(--studio-border)] bg-[var(--studio-surface)] p-3 transition-transform lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        <nav className="space-y-1">
          {links.map((link) => {
            const active =
              link.href === "/studio" ? pathname === link.href : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className={`flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors ${active ? "bg-[var(--studio-active)] text-[var(--studio-accent)]" : "hover:bg-[var(--studio-subtle)]"}`}
              >
                <link.icon className="h-5 w-5" />
                {link.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <main className="min-h-screen pt-16 lg:pl-64">
        <div className="mx-auto max-w-[1800px] p-4 md:p-6 xl:p-8">{children}</div>
      </main>
    </div>
  );
}
