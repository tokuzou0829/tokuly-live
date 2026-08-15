import { notifyTokulyUnauthorized } from "@/lib/auth-session-events";
import type { Reaction, StreamReaction } from "@/types/reaction";

export class ReactionApiError extends Error {
  status: number;
  fields: Record<string, string[]>;

  constructor(status: number, message: string, fields: Record<string, string[]> = {}) {
    super(message);
    this.name = "ReactionApiError";
    this.status = status;
    this.fields = fields;
  }
}

function rootUrl(): string {
  const root = process.env.NEXT_PUBLIC_API_ROOT?.replace(/\/+$/, "");
  if (!root) throw new Error("NEXT_PUBLIC_API_ROOT が設定されていません");
  return `${root}/v1/live`;
}

function defaultMessage(status: number): string {
  if (status === 401) return "ログインの有効期限が切れました。もう一度ログインしてください。";
  if (status === 409) return "現在の配信状態では評価できません。";
  if (status === 422) return "評価内容が正しくありません。";
  return "評価を更新できませんでした。時間をおいてもう一度お試しください。";
}

async function request(
  streamId: number,
  token: string,
  init: RequestInit = {}
): Promise<StreamReaction> {
  const response = await fetch(`${rootUrl()}/streams/${encodeURIComponent(streamId)}/reaction`, {
    ...init,
    cache: "no-store",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401 && typeof window !== "undefined") notifyTokulyUnauthorized();
    const body = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
    throw new ReactionApiError(
      response.status,
      typeof body.message === "string" ? body.message : defaultMessage(response.status),
      body.errors && typeof body.errors === "object"
        ? (body.errors as Record<string, string[]>)
        : {}
    );
  }
  return (payload as { data: StreamReaction }).data;
}

export function getStreamReaction(streamId: number, token: string): Promise<StreamReaction> {
  return request(streamId, token);
}

export function setStreamReaction(
  streamId: number,
  reaction: Reaction,
  token: string
): Promise<StreamReaction> {
  return request(streamId, token, {
    method: "PUT",
    body: JSON.stringify({ reaction }),
  });
}

export function removeStreamReaction(streamId: number, token: string): Promise<StreamReaction> {
  return request(streamId, token, { method: "DELETE" });
}
