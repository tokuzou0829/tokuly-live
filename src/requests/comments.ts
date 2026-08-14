import type { StreamComment, StreamCommentPage, StreamCommentReplyPage } from "@/types/comment";
import { notifyTokulyUnauthorized } from "@/lib/auth-session-events";

export class CommentApiError extends Error {
  status: number;
  fields: Record<string, string[]>;

  constructor(status: number, message: string, fields: Record<string, string[]> = {}) {
    super(message);
    this.name = "CommentApiError";
    this.status = status;
    this.fields = fields;
  }
}

function apiUrl(path: string): string {
  const root = process.env.NEXT_PUBLIC_API_ROOT?.replace(/\/+$/, "");
  if (!root) throw new Error("NEXT_PUBLIC_API_ROOT が設定されていません");
  return `${root}${path}`;
}

function defaultErrorMessage(status: number): string {
  if (status === 401) return "ログインの有効期限が切れました。もう一度ログインしてください。";
  if (status === 403) return "コメントを操作する権限がありません。";
  if (status === 404) return "コメントが見つからないか、操作する権限がありません。";
  if (status === 422) return "コメントの内容を確認してください。";
  if (status === 429) return "投稿回数が上限に達しました。しばらく待ってからお試しください。";
  return "コメントを読み込めませんでした。時間をおいてもう一度お試しください。";
}

async function commentRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(apiUrl(path), {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
  });
  const payload = response.status === 204 ? null : await response.json().catch(() => null);

  if (!response.ok) {
    if (response.status === 401) notifyTokulyUnauthorized();
    const body = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
    throw new CommentApiError(
      response.status,
      typeof body.message === "string" ? body.message : defaultErrorMessage(response.status),
      body.errors && typeof body.errors === "object"
        ? (body.errors as Record<string, string[]>)
        : {}
    );
  }

  return payload as T;
}

function streamPath(streamId: number | string): string {
  return `/v1/live/streams/${encodeURIComponent(streamId)}/comments`;
}

function authenticated(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` };
}

export function getStreamComments(
  streamId: number | string,
  beforeId?: number | null
): Promise<StreamCommentPage> {
  const before = beforeId == null ? "" : `?before_id=${encodeURIComponent(beforeId)}`;
  return commentRequest<StreamCommentPage>(`${streamPath(streamId)}${before}`);
}

export function getStreamCommentReplies(
  streamId: number | string,
  commentId: number | string,
  afterId?: number | null
): Promise<StreamCommentReplyPage> {
  const after = afterId == null ? "" : `?after_id=${encodeURIComponent(afterId)}`;
  return commentRequest<StreamCommentReplyPage>(
    `${streamPath(streamId)}/${encodeURIComponent(commentId)}/replies${after}`
  );
}

export type CreateStreamCommentInput = {
  content: string;
  parentCommentId?: number;
  channelId?: number;
};

export function createStreamComment(
  streamId: number | string,
  input: CreateStreamCommentInput,
  token: string
): Promise<StreamComment> {
  return commentRequest<StreamComment>(streamPath(streamId), {
    method: "POST",
    headers: authenticated(token),
    body: JSON.stringify({
      content: input.content,
      ...(input.parentCommentId === undefined ? {} : { parent_comment_id: input.parentCommentId }),
      ...(input.channelId === undefined ? {} : { channel_id: input.channelId }),
    }),
  });
}

export function updateStreamComment(
  streamId: number | string,
  commentId: number | string,
  content: string,
  token: string
): Promise<StreamComment> {
  return commentRequest<StreamComment>(`${streamPath(streamId)}/${encodeURIComponent(commentId)}`, {
    method: "PATCH",
    headers: authenticated(token),
    body: JSON.stringify({ content }),
  });
}

export function deleteStreamComment(
  streamId: number | string,
  commentId: number | string,
  token: string
): Promise<void> {
  return commentRequest<void>(`${streamPath(streamId)}/${encodeURIComponent(commentId)}`, {
    method: "DELETE",
    headers: authenticated(token),
  });
}
