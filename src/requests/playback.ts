import { notifyTokulyUnauthorized } from "@/lib/auth-session-events";
import type {
  PlaybackFinishInput,
  PlaybackProgressInput,
  PlaybackSessionRestoreInput,
  PlaybackSessionRestoreResult,
  PlaybackSessionStartInput,
  PlaybackSessionStartResult,
  PlaybackContentType,
  WatchHistoryItem,
  WatchHistoryPage,
} from "@/types/playback";

export const ANONYMOUS_VIEWER_STORAGE_KEY = "tokuly_viewer_token";

export class PlaybackApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = "PlaybackApiError";
  }
}

function rootUrl(): string {
  const root = process.env.NEXT_PUBLIC_API_ROOT?.replace(/\/+$/, "");
  if (!root) throw new Error("NEXT_PUBLIC_API_ROOT が設定されていません");
  return `${root}/v1/live`;
}

async function jsonRequest<T>(path: string, init: RequestInit): Promise<T> {
  const response = await fetch(`${rootUrl()}${path}`, {
    ...init,
    cache: "no-store",
    headers: { Accept: "application/json", ...init.headers },
  });
  const payload = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401 && typeof window !== "undefined") notifyTokulyUnauthorized();
    const message =
      payload && typeof payload === "object" && typeof payload.message === "string"
        ? payload.message
        : "視聴情報を送信できませんでした。";
    throw new PlaybackApiError(response.status, message);
  }
  return payload as T;
}

function playbackHeaders(options: { accessToken?: string; viewerToken?: string }): HeadersInit {
  return {
    "Content-Type": "application/json",
    ...(options.accessToken ? { Authorization: `Bearer ${options.accessToken}` } : {}),
    ...(!options.accessToken && options.viewerToken
      ? { "X-Tokuly-Viewer": options.viewerToken }
      : {}),
  };
}

export async function startPlaybackSession(
  input: PlaybackSessionStartInput,
  options: { accessToken?: string; viewerToken?: string }
): Promise<PlaybackSessionStartResult> {
  const payload = await jsonRequest<{ data: PlaybackSessionStartResult }>("/playback-sessions", {
    method: "POST",
    headers: playbackHeaders(options),
    body: JSON.stringify(input),
  });
  return payload.data;
}

export async function restorePlaybackSession(
  input: PlaybackSessionRestoreInput,
  options: { accessToken?: string; viewerToken?: string }
): Promise<PlaybackSessionRestoreResult> {
  const payload = await jsonRequest<{ data: PlaybackSessionRestoreResult }>(
    "/playback-sessions/restore",
    {
      method: "POST",
      headers: playbackHeaders(options),
      body: JSON.stringify(input),
    }
  );
  return payload.data;
}

export function sendPlaybackProgress(
  sessionId: string,
  input: PlaybackProgressInput,
  options: { accessToken?: string; viewerToken?: string }
): Promise<unknown> {
  return jsonRequest(`/playback-sessions/${encodeURIComponent(sessionId)}/progress`, {
    method: "POST",
    headers: playbackHeaders(options),
    body: JSON.stringify(input),
  });
}

export function finishPlaybackSession(
  sessionId: string,
  input: PlaybackFinishInput,
  options: { accessToken?: string; viewerToken?: string; keepalive?: boolean }
): Promise<unknown> {
  return jsonRequest(`/playback-sessions/${encodeURIComponent(sessionId)}/finish`, {
    method: "POST",
    keepalive: options.keepalive,
    headers: playbackHeaders(options),
    body: JSON.stringify(input),
  });
}

function numberValue(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeHistoryItem(raw: Record<string, unknown>): WatchHistoryItem {
  const content =
    raw.content && typeof raw.content === "object" ? (raw.content as Record<string, unknown>) : raw;
  const channel =
    content.channel && typeof content.channel === "object"
      ? (content.channel as Record<string, unknown>)
      : null;
  const contentType = raw.content_type ?? content.content_type ?? content.type;
  const contentKey =
    raw.content_key ?? content.content_key ?? content.key ?? content.stream_key ?? content.clip_key;
  return {
    content_type: String(contentType) as PlaybackContentType,
    content_key: String(contentKey ?? ""),
    title: String(content.title ?? "無題のコンテンツ"),
    thumbnail_url:
      typeof content.thumbnail_url === "string"
        ? content.thumbnail_url
        : typeof content.static_thumbnail_url === "string"
          ? content.static_thumbnail_url
          : null,
    duration_seconds:
      content.duration_seconds == null ? null : numberValue(content.duration_seconds),
    channel_name:
      typeof content.channel_name === "string"
        ? content.channel_name
        : typeof channel?.name === "string"
          ? channel.name
          : null,
    channel_handle:
      typeof content.channel_handle === "string"
        ? content.channel_handle
        : typeof channel?.handle === "string"
          ? channel.handle
          : null,
    view_count:
      content.view_count != null
        ? numberValue(content.view_count)
        : raw.view_count != null
          ? numberValue(raw.view_count)
          : undefined,
    resume_position_ms: numberValue(raw.resume_position_ms),
    total_watched_seconds: numberValue(raw.total_watched_seconds),
    completed: Boolean(raw.completed),
    completed_at: typeof raw.completed_at === "string" ? raw.completed_at : null,
    last_watched_at:
      typeof raw.last_watched_at === "string" ? raw.last_watched_at : new Date(0).toISOString(),
  };
}

export async function getWatchHistory(
  channelId: number,
  token: string,
  params: { page?: number; per_page?: number } = {}
): Promise<WatchHistoryPage> {
  const query = new URLSearchParams();
  if (params.page) query.set("page", String(params.page));
  if (params.per_page) query.set("per_page", String(params.per_page));
  const suffix = query.size ? `?${query}` : "";
  const payload = await jsonRequest<Record<string, unknown>>(
    `/channels/${channelId}/watch-history${suffix}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const nestedData =
    payload.data && typeof payload.data === "object" && !Array.isArray(payload.data)
      ? (payload.data as Record<string, unknown>)
      : null;
  const page = nestedData ?? payload;
  const items = Array.isArray(page.data)
    ? page.data
    : Array.isArray(payload.data)
      ? payload.data
      : [];
  const metaSource =
    page.meta && typeof page.meta === "object"
      ? (page.meta as Record<string, unknown>)
      : page.pagination && typeof page.pagination === "object"
        ? (page.pagination as Record<string, unknown>)
        : page;
  const linksSource =
    page.links && typeof page.links === "object" ? (page.links as WatchHistoryPage["links"]) : {};
  const currentPage = Math.max(1, numberValue(metaSource.current_page, params.page ?? 1));
  const perPage = Math.max(1, numberValue(metaSource.per_page, params.per_page ?? 20));
  const total = Math.max(0, numberValue(metaSource.total, items.length));
  const lastPage = Math.max(1, numberValue(metaSource.last_page, Math.ceil(total / perPage) || 1));
  return {
    data: items.map((item) => normalizeHistoryItem(item as unknown as Record<string, unknown>)),
    links: linksSource,
    meta: {
      current_page: currentPage,
      from:
        metaSource.from == null
          ? items.length
            ? (currentPage - 1) * perPage + 1
            : null
          : numberValue(metaSource.from),
      last_page: lastPage,
      per_page: perPage,
      to:
        metaSource.to == null
          ? items.length
            ? (currentPage - 1) * perPage + items.length
            : null
          : numberValue(metaSource.to),
      total,
    },
  };
}

export function deleteWatchHistoryItem(
  channelId: number,
  contentType: PlaybackContentType,
  contentKey: string,
  token: string
): Promise<unknown> {
  return jsonRequest(
    `/channels/${channelId}/watch-history/${contentType}/${encodeURIComponent(contentKey)}`,
    { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }
  );
}

export function clearWatchHistory(channelId: number, token: string): Promise<unknown> {
  return jsonRequest(`/channels/${channelId}/watch-history`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function watchHistoryHref(item: WatchHistoryItem): string {
  const base = `/${item.content_type === "clip" ? "clip" : "video"}/${encodeURIComponent(item.content_key)}`;
  if (item.completed || item.resume_position_ms <= 0) return base;
  return `${base}?t=${Math.floor(item.resume_position_ms / 1000)}`;
}
