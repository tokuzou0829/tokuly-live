import { normalizeSentGiftPage } from "@/lib/gifts";
import type {
  CreateGiftSessionInput,
  CreatedGiftSession,
  ReturnGiftResponse,
  SentGiftPage,
} from "@/types/gift";

export class GiftApiError extends Error {
  status: number;
  fields: Record<string, string[]>;

  constructor(status: number, message: string, fields: Record<string, string[]> = {}) {
    super(message);
    this.name = "GiftApiError";
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
  if (status === 403) return "このギフトを操作する権限がありません。";
  if (status === 422) return "入力内容を確認してください。";
  if (status === 429) return "送信回数が上限に達しました。しばらく待ってからお試しください。";
  return "ギフト情報を取得できませんでした。時間をおいてもう一度お試しください。";
}

async function giftRequest<T>(path: string, token: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(apiUrl(path), {
    ...init,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const body = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
    throw new GiftApiError(
      response.status,
      typeof body.message === "string" ? body.message : defaultErrorMessage(response.status),
      body.errors && typeof body.errors === "object"
        ? (body.errors as Record<string, string[]>)
        : {}
    );
  }
  return payload as T;
}

export function createGiftSession(
  input: CreateGiftSessionInput,
  token: string
): Promise<CreatedGiftSession> {
  return giftRequest<CreatedGiftSession>("/v1/live/gifts/sessions", token, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function getSentGifts(page: number, token: string): Promise<SentGiftPage> {
  const response = await giftRequest<unknown>(`/v1/live/gifts/sent?page=${page}`, token);
  return normalizeSentGiftPage(response);
}

export function returnGift(giftId: number | string, token: string): Promise<ReturnGiftResponse> {
  return giftRequest<ReturnGiftResponse>(
    `/v1/live/gifts/${encodeURIComponent(giftId)}/return`,
    token,
    {
      method: "POST",
    }
  );
}
