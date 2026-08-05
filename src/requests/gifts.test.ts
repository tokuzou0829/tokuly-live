import { beforeEach, describe, expect, it, vi } from "vitest";
import { createGiftSession, getSentGifts, returnGift } from "./gifts";

describe("gift requests", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  it("creates a session with bearer authentication", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ gift_id: "01J", gift_email: "01j@gift.tokuly.com" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );
    await createGiftSession(
      { channel_id: 2, live_stream_id: 3, amount: 1000, comment: "応援" },
      "token"
    );
    expect(fetch).toHaveBeenCalledWith(
      "https://api.example.test/v1/live/gifts/sessions",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: "Bearer token" }),
      })
    );
  });

  it("maps validation errors", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ message: "入力エラー", errors: { amount: ["範囲外です"] } }), {
        status: 422,
        headers: { "Content-Type": "application/json" },
      })
    );
    await expect(
      createGiftSession({ channel_id: 2, live_stream_id: 3, amount: 100, comment: "" }, "token")
    ).rejects.toMatchObject({
      status: 422,
      message: "入力エラー",
      fields: { amount: ["範囲外です"] },
    });
  });

  it("keeps recipient and sender channel ids separate", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ gift_id: "01J", gift_email: "01j@gift.tokuly.com" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );
    await createGiftSession(
      {
        channel_id: 2,
        sender_channel_id: 7,
        live_stream_id: 3,
        amount: 1000,
        comment: "応援",
      },
      "token"
    );
    const init = vi.mocked(fetch).mock.calls[0][1];
    expect(JSON.parse(String(init?.body))).toMatchObject({
      channel_id: 2,
      sender_channel_id: 7,
    });
  });

  it("normalizes sent gift pagination", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ data: [], current_page: 2, last_page: 4, total: 12 }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );
    await expect(getSentGifts(2, "token")).resolves.toEqual({
      data: [],
      currentPage: 2,
      lastPage: 4,
      total: 12,
    });
  });

  it("requests a return URL without retaining it", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ claim_url: "https://amazon.example/claim" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );
    await expect(returnGift(99, "token")).resolves.toEqual({
      claim_url: "https://amazon.example/claim",
    });
    expect(fetch).toHaveBeenCalledWith(
      "https://api.example.test/v1/live/gifts/99/return",
      expect.objectContaining({ method: "POST" })
    );
  });
});
