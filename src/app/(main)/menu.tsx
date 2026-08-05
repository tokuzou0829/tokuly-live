"use client";

import React, { useCallback, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signIn, signOut, useSession } from "next-auth/react";
import { Check, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getOwnedChannels, OwnedChannelsApiError } from "@/requests/owned-channels";
import type { OwnedChannel, PostingIdentity } from "@/types/identity";

function initials(name: string): string {
  return name.trim().slice(0, 2) || "T";
}

function IdentityRow({
  identity,
  selected,
  disabled,
  onSelect,
}: {
  identity: PostingIdentity;
  selected: boolean;
  disabled: boolean;
  onSelect: () => void;
}) {
  return (
    <DropdownMenuItem className="cursor-pointer gap-2 py-2" disabled={disabled} onSelect={onSelect}>
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarImage src={identity.profilePhotoUrl ?? undefined} />
        <AvatarFallback>{initials(identity.name)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{identity.name}</p>
        {identity.handle && (
          <p className="truncate text-xs text-muted-foreground">@{identity.handle}</p>
        )}
      </div>
      {selected && <Check className="h-4 w-4 shrink-0" aria-label="選択中" />}
    </DropdownMenuItem>
  );
}

export default function AccountDropdownMenu() {
  const { data: session, update } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const [channels, setChannels] = useState<OwnedChannel[]>([]);
  const [loading, setLoading] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [error, setError] = useState("");
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const activeIdentity = session?.activePostingIdentity;
  const accessToken = session?.user?.access_token;

  const switchIdentity = useCallback(
    async (channelId: number | null) => {
      if (switching) return;
      setSwitching(true);
      setError("");
      try {
        const updated = await update({ activeChannelId: channelId });
        const updatedChannelId =
          updated?.activePostingIdentity?.type === "channel"
            ? updated.activePostingIdentity.channelId
            : null;
        if (updatedChannelId !== channelId) {
          throw new Error("選択したアカウントへ切り替えられませんでした。");
        }
        router.refresh();
      } catch (caught) {
        setError(
          caught instanceof Error ? caught.message : "アカウントを切り替えられませんでした。"
        );
      } finally {
        setSwitching(false);
      }
    },
    [router, switching, update]
  );

  const loadChannels = useCallback(async () => {
    if (!accessToken || loading) return;
    setLoading(true);
    setError("");
    setErrorStatus(null);
    try {
      const ownedChannels = await getOwnedChannels(accessToken);
      setChannels(ownedChannels);
      if (
        activeIdentity?.type === "channel" &&
        !ownedChannels.some((channel) => channel.id === activeIdentity.channelId)
      ) {
        await switchIdentity(null);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "チャンネル一覧を取得できませんでした。");
      setErrorStatus(caught instanceof OwnedChannelsApiError ? caught.status : null);
    } finally {
      setLoading(false);
    }
  }, [accessToken, activeIdentity, loading, switchIdentity]);

  if (!session?.user || !activeIdentity) {
    return (
      <Button onClick={() => signIn("tokuly", { callbackUrl: pathname ?? "/" })}>ログイン</Button>
    );
  }

  const userIdentity: PostingIdentity = {
    type: "user",
    accountId: String(session.user.id ?? ""),
    name: session.user.name ?? "Tokulyユーザー",
    handle: session.user.handle ?? "",
    profilePhotoUrl: session.user.image ?? null,
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          aria-label={`${activeIdentity.name}のアカウントメニュー`}
          className="relative mr-[10px] h-8 w-8 rounded-full"
          style={{ marginLeft: "10px", marginTop: "10px" }}
        >
          <Avatar className="h-10 w-10">
            <AvatarImage src={activeIdentity.profilePhotoUrl ?? undefined} />
            <AvatarFallback>{initials(activeIdentity.name)}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex items-center gap-2">
            <Avatar className="h-9 w-9">
              <AvatarImage src={activeIdentity.profilePhotoUrl ?? undefined} />
              <AvatarFallback>{initials(activeIdentity.name)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium leading-none">{activeIdentity.name}</p>
              {activeIdentity.handle && (
                <p className="mt-1 truncate text-xs text-muted-foreground">
                  @{activeIdentity.handle}
                </p>
              )}
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuSub onOpenChange={(open) => open && void loadChannels()}>
          <DropdownMenuSubTrigger className="cursor-pointer">
            アカウントを切り替え
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-72">
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Tokulyアカウント
            </DropdownMenuLabel>
            <IdentityRow
              identity={userIdentity}
              selected={activeIdentity.type === "user"}
              disabled={switching}
              onSelect={() => void switchIdentity(null)}
            />
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              あなたのチャンネル
            </DropdownMenuLabel>
            {loading ? (
              <div className="flex items-center gap-2 px-2 py-3 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> 読み込み中
              </div>
            ) : error ? (
              <div className="space-y-2 px-2 py-3">
                <p role="alert" className="text-xs text-destructive">
                  {error}
                </p>
                {errorStatus === 401 || errorStatus === 403 ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => signIn("tokuly", { callbackUrl: pathname ?? "/" })}
                  >
                    再ログイン
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => void loadChannels()}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" /> 再試行
                  </Button>
                )}
              </div>
            ) : channels.length === 0 ? (
              <p className="px-2 py-3 text-xs text-muted-foreground">チャンネルはありません</p>
            ) : (
              channels.map((channel) => {
                const identity: PostingIdentity = {
                  type: "channel",
                  accountId: userIdentity.accountId,
                  channelId: channel.id,
                  name: channel.name,
                  handle: channel.handle,
                  profilePhotoUrl: channel.profile_photo_url,
                };
                return (
                  <IdentityRow
                    key={channel.id}
                    identity={identity}
                    selected={
                      activeIdentity.type === "channel" && activeIdentity.channelId === channel.id
                    }
                    disabled={switching}
                    onSelect={() => void switchIdentity(channel.id)}
                  />
                );
              })
            )}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <Link href="/gifts">
            <DropdownMenuItem className="cursor-pointer">ギフト履歴</DropdownMenuItem>
          </Link>
          <Link href="https://tokuly.com/studio" target="_blank">
            <DropdownMenuItem className="cursor-pointer">配信する</DropdownMenuItem>
          </Link>
          <Link href="https://tokuly.com/user/profile" target="_blank">
            <DropdownMenuItem className="cursor-pointer">アカウント管理</DropdownMenuItem>
          </Link>
          <Link href="https://tokuly.com/" target="_blank">
            <DropdownMenuItem className="cursor-pointer">tokulyに移動</DropdownMenuItem>
          </Link>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/" })} className="cursor-pointer">
          サインアウト
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
