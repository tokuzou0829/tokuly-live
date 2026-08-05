import { beforeEach, describe, expect, it, vi } from "vitest";
import type { JWT } from "next-auth/jwt";
import { initialPostingIdentity, updatedPostingIdentity } from "./lib/posting-identity";

const token = {
  sub: "12",
  name: "User",
  picture: "https://example.test/user.jpg",
  access_token: "token",
  expires_at: 4_000_000_000,
  user: { id: "12", name: "User", handle: "user", image: "https://example.test/user.jpg" },
} as JWT;

describe("initial posting identity", () => {
  beforeEach(() => vi.stubGlobal("fetch", vi.fn()));

  it("uses the main channel without retaining its password", async () => {
    vi.mocked(fetch).mockImplementation(
      async () =>
        new Response(
          JSON.stringify({
            result: "ok",
            id: 7,
            name: "Channel",
            handle: "channel",
            icon: "https://example.test/channel.jpg",
            channel_password: "must-not-leak",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
    );

    const identity = await initialPostingIdentity(token);
    expect(identity).toEqual({
      type: "channel",
      accountId: "12",
      channelId: 7,
      name: "Channel",
      handle: "channel",
      profilePhotoUrl: "https://example.test/channel.jpg",
    });
    expect(identity).not.toHaveProperty("channel_password");
  });

  it.each([
    new Response(null, { status: 404 }),
    new Response(JSON.stringify({ result: "error" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }),
  ])("falls back to the user when no valid main channel is available", async (response) => {
    vi.mocked(fetch).mockResolvedValue(response);
    await expect(initialPostingIdentity(token)).resolves.toMatchObject({
      type: "user",
      accountId: "12",
      handle: "user",
    });
  });
});

describe("posting identity updates", () => {
  beforeEach(() => vi.stubGlobal("fetch", vi.fn()));

  it("accepts only a channel returned by the ownership API", async () => {
    vi.mocked(fetch).mockImplementation(
      async () =>
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

    await expect(updatedPostingIdentity(token, 7)).resolves.toMatchObject({
      type: "channel",
      channelId: 7,
    });
    await expect(updatedPostingIdentity(token, 99)).resolves.toBeNull();
  });

  it("switches back to the user without loading channels", async () => {
    await expect(updatedPostingIdentity(token, null)).resolves.toMatchObject({ type: "user" });
    expect(fetch).not.toHaveBeenCalled();
  });
});
