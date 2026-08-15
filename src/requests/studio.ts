import { notifyTokulyUnauthorized } from "@/lib/auth-session-events";
import type {
  GameResult,
  ListenerAnalytics,
  ReceivedStudioGift,
  StudioChannel,
  StudioCommentPage,
  StudioCommentReplyPage,
  StudioPage,
  StudioStream,
  StudioSubtitlesResponse,
  UploadSession,
} from "@/types/studio";
import type { ClipPage, ClipResource, CreateClipInput } from "@/types/clip";
import type { ReactionAnalytics } from "@/types/reaction";

export class StudioApiError extends Error {
  status: number;
  fields: Record<string, string[]>;

  constructor(status: number, message: string, fields: Record<string, string[]> = {}) {
    super(message);
    this.name = "StudioApiError";
    this.status = status;
    this.fields = fields;
  }
}

function rootUrl(): string {
  const root = process.env.NEXT_PUBLIC_API_ROOT?.replace(/\/+$/, "");
  if (!root) throw new Error("NEXT_PUBLIC_API_ROOT が設定されていません");
  return `${root}/v1/live/studio`;
}

function defaultMessage(status: number): string {
  if (status === 401) return "ログインの有効期限が切れました。";
  if (status === 403) return "Studioを利用する権限がありません。";
  if (status === 404) return "対象が見つからないか、操作する権限がありません。";
  if (status === 409) return "現在の状態では操作できません。最新の状態を確認してください。";
  if (status === 422) return "入力内容を確認してください。";
  if (status === 502) return "配信サービスとの通信に失敗しました。時間をおいて再試行してください。";
  return "Studioのデータを取得できませんでした。";
}

async function request<T>(path: string, token: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${rootUrl()}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      ...(!(init.body instanceof FormData) && init.body
        ? { "Content-Type": "application/json" }
        : {}),
      ...init.headers,
    },
  });
  const payload = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401 && typeof window !== "undefined") notifyTokulyUnauthorized();
    const body = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
    throw new StudioApiError(
      response.status,
      typeof body.message === "string" ? body.message : defaultMessage(response.status),
      body.errors && typeof body.errors === "object"
        ? (body.errors as Record<string, string[]>)
        : {}
    );
  }
  return payload as T;
}

const data = <T>(payload: { data: T }) => payload.data;
const query = (params: Record<string, string | number | undefined>) => {
  const value = new URLSearchParams();
  Object.entries(params).forEach(
    ([key, entry]) => entry !== undefined && value.set(key, String(entry))
  );
  const encoded = value.toString();
  return encoded ? `?${encoded}` : "";
};

export async function getStudioChannels(token: string): Promise<StudioChannel[]> {
  return data(await request<{ data: StudioChannel[] }>("/channels", token));
}

export type CreateStudioChannelInput = {
  name: string;
  handle: string;
  icon?: File;
};

export async function createStudioChannel(
  input: CreateStudioChannelInput,
  token: string
): Promise<StudioChannel> {
  let body: FormData | string;
  if (input.icon) {
    const form = new FormData();
    form.set("name", input.name);
    form.set("handle", input.handle);
    form.set("icon", input.icon);
    body = form;
  } else {
    body = JSON.stringify({ name: input.name, handle: input.handle });
  }
  return data(
    await request<{ data: StudioChannel }>("/channels", token, {
      method: "POST",
      body,
    })
  );
}

export async function getStudioChannel(id: number, token: string): Promise<StudioChannel> {
  return data(await request<{ data: StudioChannel }>(`/channels/${id}`, token));
}

export async function updateStudioChannel(
  id: number,
  form: FormData | Record<string, unknown>,
  token: string
): Promise<StudioChannel> {
  const hasFiles = form instanceof FormData;
  if (hasFiles) form.set("_method", "PATCH");
  return data(
    await request<{ data: StudioChannel }>(`/channels/${id}`, token, {
      method: hasFiles ? "POST" : "PATCH",
      body: hasFiles ? form : JSON.stringify(form),
    })
  );
}

export function getStudioStreams(
  channelId: number,
  token: string,
  params: { type?: "live" | "video"; status?: string; page?: number; per_page?: number } = {}
): Promise<StudioPage<StudioStream>> {
  return request(`/channels/${channelId}/streams${query(params)}`, token);
}

export async function getStudioReactionAnalytics(
  channelId: number,
  token: string
): Promise<ReactionAnalytics> {
  return data(
    await request<{ data: ReactionAnalytics }>(`/channels/${channelId}/reaction-analytics`, token)
  );
}

export async function getStudioStreamReactionAnalytics(
  streamId: number,
  token: string
): Promise<ReactionAnalytics> {
  return data(
    await request<{ data: ReactionAnalytics }>(`/streams/${streamId}/reaction-analytics`, token)
  );
}

export type StudioCommentListParams = {
  view?: "flat" | "threaded";
  query?: string;
  author?: string;
  author_type?: "user" | "channel";
  from?: string;
  to?: string;
  stream_id?: number;
  per_page?: number;
  page?: number;
};

export function getStudioChannelComments(
  channelId: number,
  token: string,
  params: StudioCommentListParams = {}
): Promise<StudioCommentPage> {
  return request(`/channels/${channelId}/comments${query(params)}`, token);
}

export function getStudioStreamComments(
  streamId: number,
  token: string,
  params: Omit<StudioCommentListParams, "stream_id"> = {}
): Promise<StudioCommentPage> {
  return request(`/streams/${streamId}/comments${query(params)}`, token);
}

export function getStudioCommentReplies(
  streamId: number,
  commentId: number,
  token: string,
  afterId?: number | null
): Promise<StudioCommentReplyPage> {
  return request(
    `/streams/${streamId}/comments/${commentId}/replies${query({
      after_id: afterId ?? undefined,
    })}`,
    token
  );
}

export function deleteStudioComment(
  streamId: number,
  commentId: number,
  token: string
): Promise<void> {
  return request(`/streams/${streamId}/comments/${commentId}`, token, { method: "DELETE" });
}

export async function addStudioCommentReaction(
  streamId: number,
  commentId: number,
  token: string
): Promise<string> {
  return data(
    await request<{ data: { creator_reacted_at: string } }>(
      `/streams/${streamId}/comments/${commentId}/reaction`,
      token,
      { method: "PUT" }
    )
  ).creator_reacted_at;
}

export function removeStudioCommentReaction(
  streamId: number,
  commentId: number,
  token: string
): Promise<void> {
  return request(`/streams/${streamId}/comments/${commentId}/reaction`, token, {
    method: "DELETE",
  });
}

export async function createStudioClip(
  channelId: number,
  input: CreateClipInput,
  token: string
): Promise<ClipResource> {
  return data(
    await request<{ data: ClipResource }>(`/channels/${channelId}/clips`, token, {
      method: "POST",
      body: JSON.stringify(input),
    })
  );
}

export function getStudioCreatedClips(
  channelId: number,
  token: string,
  params: { source_video_id?: number; page?: number; per_page?: number } = {}
): Promise<ClipPage> {
  return request(`/channels/${channelId}/clips/created${query(params)}`, token);
}

export function getStudioContentClips(
  channelId: number,
  token: string,
  params: { source_video_id?: number; page?: number; per_page?: number } = {}
): Promise<ClipPage> {
  return request(`/channels/${channelId}/clips/on-content${query(params)}`, token);
}

export function deleteStudioClip(channelId: number, clipKey: string, token: string): Promise<void> {
  return request(`/channels/${channelId}/clips/${encodeURIComponent(clipKey)}`, token, {
    method: "DELETE",
  });
}

export async function createStudioStream(
  channelId: number,
  input: { type: "live" | "video"; title: string; thumbnail?: File },
  token: string
): Promise<StudioStream> {
  let body: FormData | string;
  if (input.thumbnail) {
    const form = new FormData();
    form.set("type", input.type);
    form.set("title", input.title);
    form.set("thumbnail", input.thumbnail);
    body = form;
  } else body = JSON.stringify({ type: input.type, title: input.title });
  return data(
    await request<{ data: StudioStream }>(`/channels/${channelId}/streams`, token, {
      method: "POST",
      body,
    })
  );
}

export async function getStudioStream(id: number, token: string): Promise<StudioStream> {
  return data(await request<{ data: StudioStream }>(`/streams/${id}`, token));
}

export async function updateStudioStream(
  id: number,
  input: FormData | Record<string, unknown>,
  token: string
): Promise<StudioStream> {
  const hasFiles = input instanceof FormData;
  if (hasFiles) input.set("_method", "PATCH");
  return data(
    await request<{ data: StudioStream }>(`/streams/${id}`, token, {
      method: hasFiles ? "POST" : "PATCH",
      body: hasFiles ? input : JSON.stringify(input),
    })
  );
}

export function deleteStudioStream(id: number, token: string): Promise<void> {
  return request(`/streams/${id}`, token, { method: "DELETE" });
}

export function getStudioSubtitles(id: number, token: string): Promise<StudioSubtitlesResponse> {
  return request(`/streams/${id}/subtitles`, token);
}

export function addStudioSubtitle(id: number, form: FormData, token: string) {
  return request<{ data: unknown }>(`/streams/${id}/subtitles`, token, {
    method: "POST",
    body: form,
  });
}

export function updateStudioSubtitle(
  streamId: number,
  subtitleId: number,
  input: { language_code: string; label: string },
  token: string
) {
  return request<{ data: unknown }>(`/streams/${streamId}/subtitles/${subtitleId}`, token, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function deleteStudioSubtitle(streamId: number, subtitleId: number, token: string) {
  return request<void>(`/streams/${streamId}/subtitles/${subtitleId}`, token, { method: "DELETE" });
}

export async function getListenerAnalytics(id: number, token: string): Promise<ListenerAnalytics> {
  return data(
    await request<{ data: ListenerAnalytics }>(`/streams/${id}/listener-analytics`, token, {
      headers: { "Cache-Control": "no-cache" },
    })
  );
}

export async function getUploadSession(id: number, token: string): Promise<UploadSession> {
  return data(await request<{ data: UploadSession }>(`/streams/${id}/upload-session`, token));
}

export function getReceivedGifts(token: string, page = 1) {
  return request<StudioPage<ReceivedStudioGift>>(`/gifts/received?per_page=20&page=${page}`, token);
}

export async function claimGift(id: number, token: string): Promise<string> {
  const result = data(
    await request<{ data: { claim_url: string; accessed_at: string } }>(
      `/gifts/${id}/claim`,
      token,
      {
        method: "POST",
      }
    )
  );
  return result.claim_url;
}

export async function returnGift(id: number, token: string): Promise<string> {
  const result = data(
    await request<{ data: { claim_url: string; accessed_at: string } }>(
      `/gifts/${id}/return`,
      token,
      {
        method: "POST",
      }
    )
  );
  return result.claim_url;
}

export async function searchGames(term: string, token: string): Promise<GameResult[]> {
  return data(await request<{ data: GameResult[] }>(`/games${query({ query: term })}`, token)).map(
    (game) => ({
      ...game,
      cover_url: game.cover_url?.startsWith("//") ? `https:${game.cover_url}` : game.cover_url,
    })
  );
}
