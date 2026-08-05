import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createStreamComment,
  deleteStreamComment,
  getStreamComments,
  updateStreamComment,
} from "./comments";

const comment = {
  id: 10,
  content: "テストコメント",
  author: { id: 1, name: "投稿者", profile_photo_url: "https://example.test/avatar.png" },
  created_at: "2026-07-30T10:00:00+09:00",
  updated_at: "2026-07-30T10:00:00+09:00",
  edited_at: null,
};

describe("stream comment requests", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  it("loads public comments with before_id pagination", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ data: [comment], next_before_id: 10, has_more: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    await expect(getStreamComments(3, 42)).resolves.toMatchObject({ has_more: true });
    expect(fetch).toHaveBeenCalledWith(
      "https://api.example.test/v1/live/streams/3/comments?before_id=42",
      expect.objectContaining({ headers: expect.objectContaining({ Accept: "application/json" }) })
    );
  });

  it.each([
    ["POST", () => createStreamComment(3, "投稿", "token")],
    ["PATCH", () => updateStreamComment(3, 10, "編集", "token")],
  ])("sends %s requests as authenticated JSON", async (method, request) => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify(comment), {
        status: method === "POST" ? 201 : 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    await request();
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/v1/live/streams/3/comments"),
      expect.objectContaining({
        method,
        headers: expect.objectContaining({
          Authorization: "Bearer token",
          "Content-Type": "application/json",
        }),
      })
    );
  });

  it("accepts a 204 response when deleting", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 204 }));

    await expect(deleteStreamComment(3, 10, "token")).resolves.toBeNull();
    expect(fetch).toHaveBeenCalledWith(
      "https://api.example.test/v1/live/streams/3/comments/10",
      expect.objectContaining({ method: "DELETE" })
    );
  });

  it("adds channel_id only for channel posting", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify(comment), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      })
    );

    await createStreamComment(3, "チャンネル投稿", "token", 7);
    const init = vi.mocked(fetch).mock.calls[0][1];
    expect(JSON.parse(String(init?.body))).toEqual({ content: "チャンネル投稿", channel_id: 7 });
  });

  it("maps validation errors", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ message: "入力エラー", errors: { content: ["必須です"] } }), {
        status: 422,
        headers: { "Content-Type": "application/json" },
      })
    );

    await expect(createStreamComment(3, "", "token")).rejects.toMatchObject({
      status: 422,
      message: "入力エラー",
      fields: { content: ["必須です"] },
    });
  });
});
