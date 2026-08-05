import type { OwnedChannel, OwnedChannelsResponse } from "@/types/identity";
import { notifyTokulyUnauthorized } from "@/lib/auth-session-events";

export class OwnedChannelsApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "OwnedChannelsApiError";
    this.status = status;
  }
}

function apiUrl(path: string): string {
  const root = process.env.NEXT_PUBLIC_API_ROOT?.replace(/\/+$/, "");
  if (!root) throw new Error("NEXT_PUBLIC_API_ROOT が設定されていません");
  return `${root}${path}`;
}

export async function getOwnedChannels(token: string): Promise<OwnedChannel[]> {
  const response = await fetch(apiUrl("/v1/live/channels"), {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401) notifyTokulyUnauthorized();
    const fallback =
      response.status === 401
        ? "ログインの有効期限が切れました。"
        : response.status === 403
          ? "チャンネル一覧の取得に必要な権限がありません。"
          : "チャンネル一覧を取得できませんでした。";
    const message =
      payload && typeof payload === "object" && typeof payload.message === "string"
        ? payload.message
        : fallback;
    throw new OwnedChannelsApiError(response.status, message);
  }

  const data = payload as OwnedChannelsResponse | null;
  if (!data || !Array.isArray(data.data)) {
    throw new OwnedChannelsApiError(response.status, "チャンネル一覧の形式が不正です。");
  }
  return data.data;
}
