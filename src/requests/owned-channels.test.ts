import { beforeEach, describe, expect, it, vi } from "vitest";
import { getOwnedChannels } from "./owned-channels";

describe("owned channel requests", () => {
  beforeEach(() => vi.stubGlobal("fetch", vi.fn()));

  it("loads owned channels with live scope bearer authentication", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          data: [
            {
              id: 7,
              name: "Channel",
              handle: "channel",
              profile_photo_url: "https://example.test/channel.jpg",
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );

    await expect(getOwnedChannels("token")).resolves.toHaveLength(1);
    expect(fetch).toHaveBeenCalledWith(
      "https://api.example.test/v1/live/channels",
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer token" }),
      })
    );
  });

  it.each([401, 403])("retains the %s status for reauthentication guidance", async (status) => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ message: "認証エラー" }), {
        status,
        headers: { "Content-Type": "application/json" },
      })
    );

    await expect(getOwnedChannels("token")).rejects.toMatchObject({ status });
  });
});
