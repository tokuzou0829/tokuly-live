import type { JWT } from "next-auth/jwt";
import type { MainChannelResponse, PostingIdentity } from "@/types/identity";
import { getOwnedChannels } from "@/requests/owned-channels";

function apiUrl(path: string): string {
  const root = (process.env.NEXT_PUBLIC_API_ROOT ?? "https://api.tokuly.com").replace(/\/+$/, "");
  return `${root}${path}`;
}

export function userPostingIdentity(token: JWT): PostingIdentity {
  return {
    type: "user",
    accountId: String(token.user?.id ?? token.sub ?? ""),
    name: token.user?.name ?? token.name ?? "Tokulyユーザー",
    handle: token.user?.handle ?? "",
    profilePhotoUrl: token.user?.image ?? token.picture ?? null,
  };
}

export async function initialPostingIdentity(token: JWT): Promise<PostingIdentity> {
  const fallback = userPostingIdentity(token);
  try {
    const response = await fetch(apiUrl("/v1/live/channel/main"), {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token.access_token}`,
      },
    });
    if (!response.ok) return fallback;
    const channel = (await response.json()) as Partial<MainChannelResponse>;
    if (
      channel.result !== "ok" ||
      typeof channel.id !== "number" ||
      typeof channel.name !== "string" ||
      typeof channel.handle !== "string" ||
      typeof channel.icon !== "string"
    ) {
      return fallback;
    }
    return {
      type: "channel",
      accountId: fallback.accountId,
      channelId: channel.id,
      name: channel.name,
      handle: channel.handle,
      profilePhotoUrl: channel.icon,
    };
  } catch {
    return fallback;
  }
}

export async function updatedPostingIdentity(
  token: JWT,
  requestedChannelId: unknown
): Promise<PostingIdentity | null> {
  if (requestedChannelId === null) return userPostingIdentity(token);
  if (typeof requestedChannelId !== "number" || !Number.isInteger(requestedChannelId)) return null;
  try {
    const channels = await getOwnedChannels(token.access_token);
    const channel = channels.find((candidate) => candidate.id === requestedChannelId);
    if (!channel) return null;
    return {
      type: "channel",
      accountId: String(token.user?.id ?? token.sub ?? ""),
      channelId: channel.id,
      name: channel.name,
      handle: channel.handle,
      profilePhotoUrl: channel.profile_photo_url,
    };
  } catch {
    return null;
  }
}
