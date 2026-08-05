import { describe, expect, it } from "vitest";
import {
  GIFT_TIERS,
  archiveChatItemsAtPlaybackTime,
  amazonGiftCardUrl,
  getGiftTier,
  giftAttemptFailureReason,
  giftEmailAddress,
  isGiftAttemptCompleted,
  isGiftAttemptReturnable,
  mergeChatItems,
  normalizeChatItem,
  normalizeSentGiftPage,
} from "./gifts";
import type { ChatItemGift } from "@/types/gift";

describe("gift tiers", () => {
  it("covers every configured boundary", () => {
    for (const tier of GIFT_TIERS) {
      expect(getGiftTier(tier.min)).toMatchObject(tier);
      expect(getGiftTier(tier.max)).toMatchObject(tier);
    }
  });

  it("rejects out-of-range and non-integer amounts", () => {
    expect(getGiftTier(149)).toBeNull();
    expect(getGiftTier(200_001)).toBeNull();
    expect(getGiftTier(1_000.5)).toBeNull();
  });

  it("disables comments for the lowest tier", () => {
    expect(getGiftTier(150)?.maxCommentLength).toBe(0);
    expect(getGiftTier(199)?.maxCommentLength).toBe(0);
    expect(getGiftTier(200)?.maxCommentLength).toBe(50);
  });
});

describe("Amazon gift card URL", () => {
  it("sets gpo to the gift amount", () => {
    expect(amazonGiftCardUrl(150)).toBe("https://www.amazon.co.jp/dp/B06X982RQ9?th=1&gpo=150");
    expect(amazonGiftCardUrl(200_000)).toBe(
      "https://www.amazon.co.jp/dp/B06X982RQ9?th=1&gpo=200000"
    );
  });

  it("rejects an invalid amount", () => {
    expect(() => amazonGiftCardUrl(149)).toThrow(RangeError);
  });
});

describe("gift email address", () => {
  it("builds the pending session address from its gift id", () => {
    expect(giftEmailAddress("01KYQB2N8BVW4S3QV40D98G51Z")).toBe(
      "01kyqb2n8bvw4s3qv40d98g51z@gift.tokuly.com"
    );
  });
});

describe("chat normalization", () => {
  const gift: ChatItemGift = {
    type: "gift",
    id: 10,
    name: "Alice",
    text: "応援しています",
    amount: 1_000,
    provider: "amazon",
    display_style: "yellow",
    completed_at: "2026-07-29T00:00:00Z",
  };

  it("keeps legacy messages as chat messages", () => {
    expect(normalizeChatItem({ id: null, name: "Bob", text: "hello" })).toEqual({
      type: "chat",
      id: null,
      name: "Bob",
      text: "hello",
      image: null,
    });
  });

  it("keeps archive timeline fields, including a null playback offset", () => {
    expect(
      normalizeChatItem({
        id: 12,
        name: "Bob",
        text: "archive",
        playback_offset_ms: null,
        occurred_at: "2026-08-05T12:00:45+09:00",
      })
    ).toMatchObject({
      id: 12,
      playback_offset_ms: null,
      occurred_at: "2026-08-05T12:00:45+09:00",
    });
  });

  it("normalizes gifts and falls back from unknown display styles", () => {
    expect(normalizeChatItem({ ...gift, display_style: "unknown" })).toMatchObject({
      type: "gift",
      id: 10,
      display_style: "yellow",
    });
  });

  it("deduplicates gifts while retaining ordinary messages", () => {
    const chat = { type: "chat" as const, id: null, name: "Bob", text: "hello" };
    expect(mergeChatItems([gift, chat], [gift, chat])).toEqual([gift, chat, chat]);
  });

  it("filters archive messages by playback time and reverses them for the chat layout", () => {
    const messages = [
      { type: "chat" as const, id: 1, name: "A", text: "unknown", playback_offset_ms: null },
      { type: "chat" as const, id: 2, name: "B", text: "start", playback_offset_ms: 0 },
      { type: "chat" as const, id: 3, name: "C", text: "middle", playback_offset_ms: 1_500 },
      { type: "chat" as const, id: 4, name: "D", text: "future", playback_offset_ms: 3_000 },
    ];

    expect(archiveChatItemsAtPlaybackTime(messages, 0).map(({ id }) => id)).toEqual([2, 1]);
    expect(archiveChatItemsAtPlaybackTime(messages, 2).map(({ id }) => id)).toEqual([3, 2, 1]);
    expect(archiveChatItemsAtPlaybackTime(messages, 1).map(({ id }) => id)).toEqual([2, 1]);
    expect(archiveChatItemsAtPlaybackTime(messages, 2, true).map(({ id }) => id)).toEqual([
      4, 3, 2, 1,
    ]);
  });
});

describe("sent gift pagination", () => {
  it("supports a Laravel paginator at the response root", () => {
    expect(
      normalizeSentGiftPage({ data: [{ id: 1 }], current_page: 2, last_page: 3, total: 5 })
    ).toEqual({ data: [{ id: 1 }], currentPage: 2, lastPage: 3, total: 5 });
  });

  it("supports a nested sessions paginator", () => {
    expect(
      normalizeSentGiftPage({ sessions: { data: [{ id: 2 }], current_page: 1, last_page: 1 } })
    ).toEqual({ data: [{ id: 2 }], currentPage: 1, lastPage: 1, total: 1 });
  });
});

describe("gift attempt status", () => {
  it("uses the actual API status and returnable fields", () => {
    const attempt = {
      id: 1,
      amount: 150,
      status: "completed" as const,
      accessed_at: null,
      received_at: "2026-07-30T01:26:06+09:00",
      returnable: false,
    };

    expect(isGiftAttemptCompleted(attempt)).toBe(true);
    expect(isGiftAttemptReturnable(attempt)).toBe(false);
    expect(giftAttemptFailureReason(attempt)).toBeNull();
  });

  it("only exposes return for attempts marked returnable", () => {
    const attempt = {
      id: 2,
      amount: 200,
      status: "amount_mismatch" as const,
      accessed_at: null,
      returnable: true,
    };

    expect(isGiftAttemptCompleted(attempt)).toBe(false);
    expect(isGiftAttemptReturnable(attempt)).toBe(true);
    expect(giftAttemptFailureReason(attempt)).toBe("amount_mismatch");
  });
});
