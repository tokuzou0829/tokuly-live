import type {
  ChatItem,
  GiftAttempt,
  GiftDisplayStyle,
  GiftTier,
  SentGiftPage,
  SentGiftSession,
} from "@/types/gift";

export function isGiftAttemptCompleted(attempt: GiftAttempt): boolean {
  return attempt.status === "completed" || attempt.gift_complete === true;
}

export function isGiftAttemptReturnable(attempt: GiftAttempt): boolean {
  if (typeof attempt.returnable === "boolean") return attempt.returnable;
  return !isGiftAttemptCompleted(attempt);
}

export function giftAttemptFailureReason(attempt: GiftAttempt): GiftAttempt["failure_reason"] {
  if (attempt.status && attempt.status !== "completed") return attempt.status;
  return attempt.failure_reason ?? null;
}

export const GIFT_TIERS: readonly GiftTier[] = [
  { min: 150, max: 199, displayStyle: "blue", maxCommentLength: 0 },
  { min: 200, max: 499, displayStyle: "cyan", maxCommentLength: 50 },
  { min: 500, max: 999, displayStyle: "light-green", maxCommentLength: 150 },
  { min: 1_000, max: 1_999, displayStyle: "yellow", maxCommentLength: 200 },
  { min: 2_000, max: 4_999, displayStyle: "orange", maxCommentLength: 225 },
  { min: 5_000, max: 9_999, displayStyle: "magenta", maxCommentLength: 250 },
  { min: 10_000, max: 19_999, displayStyle: "red", maxCommentLength: 270 },
  { min: 20_000, max: 29_999, displayStyle: "red", maxCommentLength: 290 },
  { min: 30_000, max: 39_999, displayStyle: "red", maxCommentLength: 310 },
  { min: 40_000, max: 49_999, displayStyle: "red", maxCommentLength: 330 },
  { min: 50_000, max: 199_999, displayStyle: "black", maxCommentLength: 350 },
  { min: 200_000, max: 200_000, displayStyle: "rainbow", maxCommentLength: 350 },
] as const;

export function amazonGiftCardUrl(amount: number): string {
  if (!getGiftTier(amount)) {
    throw new RangeError("Amazonギフトカードの金額が範囲外です");
  }
  return `https://www.amazon.co.jp/dp/B06X982RQ9?th=1&gpo=${amount}`;
}

export function giftEmailAddress(giftId: string): string {
  return `${giftId.toLowerCase()}@gift.tokuly.com`;
}

export function getGiftTier(amount: number): GiftTier | null {
  if (!Number.isInteger(amount)) return null;
  return GIFT_TIERS.find((tier) => amount >= tier.min && amount <= tier.max) ?? null;
}

export function formatYen(amount: number): string {
  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function giftStyleClass(style: GiftDisplayStyle): string {
  const classes: Record<GiftDisplayStyle, string> = {
    blue: "border-blue-500 bg-blue-50 text-blue-950",
    cyan: "border-cyan-500 bg-cyan-50 text-cyan-950",
    "light-green": "border-lime-500 bg-lime-50 text-lime-950",
    yellow: "border-yellow-500 bg-yellow-50 text-yellow-950",
    orange: "border-orange-500 bg-orange-50 text-orange-950",
    magenta: "border-fuchsia-500 bg-fuchsia-50 text-fuchsia-950",
    red: "border-red-500 bg-red-50 text-red-950",
    black: "border-zinc-800 bg-zinc-900 text-white",
    rainbow:
      "border-fuchsia-500 bg-[linear-gradient(90deg,#fee2e2,#fef9c3,#dcfce7,#cffafe,#dbeafe,#fae8ff)] text-zinc-950",
  };
  return classes[style] ?? classes.yellow;
}

export function normalizeChatItem(value: unknown): ChatItem | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Record<string, unknown>;
  const name = typeof item.name === "string" ? item.name : "匿名ユーザー";
  const text = typeof item.text === "string" ? item.text : "";
  const image = typeof item.image === "string" ? item.image : null;
  const timelineFields = {
    ...(typeof item.playback_offset_ms === "number" || item.playback_offset_ms === null
      ? { playback_offset_ms: item.playback_offset_ms }
      : {}),
    ...(typeof item.occurred_at === "string" ? { occurred_at: item.occurred_at } : {}),
  };

  if (item.type === "gift") {
    if (
      (typeof item.id !== "number" && typeof item.id !== "string") ||
      typeof item.amount !== "number"
    ) {
      return null;
    }
    const knownStyles: GiftDisplayStyle[] = [
      "blue",
      "cyan",
      "light-green",
      "yellow",
      "orange",
      "magenta",
      "red",
      "black",
      "rainbow",
    ];
    const displayStyle =
      typeof item.display_style === "string" &&
      knownStyles.includes(item.display_style as GiftDisplayStyle)
        ? (item.display_style as GiftDisplayStyle)
        : "yellow";
    return {
      ...timelineFields,
      type: "gift",
      id: item.id,
      name,
      text,
      image,
      amount: item.amount,
      provider: typeof item.provider === "string" ? item.provider : "amazon",
      display_style: displayStyle,
      completed_at: typeof item.completed_at === "string" ? item.completed_at : "",
    };
  }

  return {
    ...timelineFields,
    type: "chat",
    id: typeof item.id === "number" || typeof item.id === "string" ? item.id : null,
    name,
    text,
    image,
  };
}

export function normalizeChatItems(value: unknown): ChatItem[] {
  if (!Array.isArray(value)) return [];
  return value.map(normalizeChatItem).filter((item): item is ChatItem => item !== null);
}

export function archiveChatItemsAtPlaybackTime(
  items: ChatItem[],
  currentTimeSeconds: number
): ChatItem[] {
  const currentTimeMs = Math.max(0, currentTimeSeconds) * 1000;
  return items
    .filter((item) => (item.playback_offset_ms ?? 0) <= currentTimeMs)
    .slice()
    .reverse();
}

export function mergeChatItems(...groups: ChatItem[][]): ChatItem[] {
  const giftIds = new Set<string>();
  return groups.flat().filter((item) => {
    if (item.type !== "gift") return true;
    const key = `gift:${item.id}`;
    if (giftIds.has(key)) return false;
    giftIds.add(key);
    return true;
  });
}

export function normalizeSentGiftPage(value: unknown): SentGiftPage {
  const root = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const sessions =
    root.sessions && typeof root.sessions === "object"
      ? (root.sessions as Record<string, unknown>)
      : root;
  const rawData = Array.isArray(sessions.data)
    ? sessions.data
    : Array.isArray(root.sessions)
      ? root.sessions
      : [];
  const meta =
    root.meta && typeof root.meta === "object" ? (root.meta as Record<string, unknown>) : {};

  return {
    data: rawData as SentGiftSession[],
    currentPage: Number(sessions.current_page ?? meta.current_page ?? 1),
    lastPage: Number(sessions.last_page ?? meta.last_page ?? 1),
    total: Number(sessions.total ?? meta.total ?? rawData.length),
  };
}
