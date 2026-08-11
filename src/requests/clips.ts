import { notifyTokulyUnauthorized } from "@/lib/auth-session-events";
import type { ClipPage, ClipResource } from "@/types/clip";

export class ClipApiError extends Error {
  status: number;
  fields: Record<string, string[]>;

  constructor(status: number, message: string, fields: Record<string, string[]> = {}) {
    super(message);
    this.name = "ClipApiError";
    this.status = status;
    this.fields = fields;
  }
}

function rootUrl(): string {
  const root = process.env.NEXT_PUBLIC_API_ROOT?.replace(/\/+$/, "");
  if (!root) throw new Error("NEXT_PUBLIC_API_ROOT が設定されていません");
  return `${root}/v1/live`;
}

function messageFor(status: number): string {
  if (status === 401) return "このクリップを見るにはログインが必要です。";
  if (status === 403) return "このクリップを閲覧する権限がありません。";
  if (status === 404) return "クリップが見つかりません。";
  return "クリップを読み込めませんでした。時間をおいてもう一度お試しください。";
}

async function request<T>(path: string, token?: string): Promise<T> {
  const response = await fetch(`${rootUrl()}${path}`, {
    cache: "no-store",
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401 && typeof window !== "undefined") notifyTokulyUnauthorized();
    const body = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
    throw new ClipApiError(
      response.status,
      typeof body.message === "string" ? body.message : messageFor(response.status),
      body.errors && typeof body.errors === "object"
        ? (body.errors as Record<string, string[]>)
        : {}
    );
  }
  return payload as T;
}

function pageQuery(page: number, perPage: number): string {
  return new URLSearchParams({ page: String(page), per_page: String(perPage) }).toString();
}

export async function getClip(clipKey: string, token?: string): Promise<ClipResource> {
  const result = await request<{ data: ClipResource }>(
    `/clips/${encodeURIComponent(clipKey)}`,
    token
  );
  return result.data;
}

export function getVideoClips(
  sourceVideoId: number,
  options: { page?: number; perPage?: number; token?: string } = {}
): Promise<ClipPage> {
  const page = options.page ?? 1;
  const perPage = options.perPage ?? 20;
  return request<ClipPage>(
    `/streams/${encodeURIComponent(sourceVideoId)}/clips?${pageQuery(page, perPage)}`,
    options.token
  );
}
