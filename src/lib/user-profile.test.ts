import { beforeEach, describe, expect, it, vi } from "vitest";
import type { JWT } from "next-auth/jwt";
import { refreshUserProfile, USER_PROFILE_REFRESH_INTERVAL_SECONDS } from "./user-profile";

function createToken(): JWT {
  return {
    sub: "12",
    name: "Old name",
    picture: "https://example.test/old.jpg",
    access_token: "token",
    expires_at: 4_000_000_000,
    user: {
      id: "12",
      name: "Old name",
      handle: "old-handle",
      image: "https://example.test/old.jpg",
    },
    activePostingIdentity: {
      type: "user",
      accountId: "12",
      name: "Old name",
      handle: "old-handle",
      profilePhotoUrl: "https://example.test/old.jpg",
    },
  };
}

describe("refreshUserProfile", () => {
  beforeEach(() => vi.stubGlobal("fetch", vi.fn()));

  it("updates the token and active user identity from v1/me", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 12,
          name: "New name",
          email: "new@example.test",
          handle: "new-handle",
          profile_photo_url: "https://example.test/new.jpg",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );

    const refreshed = await refreshUserProfile(createToken(), 1_000_000);

    expect(fetch).toHaveBeenCalledWith(
      `${process.env.NEXT_PUBLIC_API_ROOT ?? "https://api.tokuly.com"}/v1/me`,
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: "Bearer token" }),
      })
    );
    expect(refreshed.user).toMatchObject({
      id: "12",
      name: "New name",
      email: "new@example.test",
      handle: "new-handle",
      image: "https://example.test/new.jpg",
    });
    expect(refreshed.activePostingIdentity).toMatchObject({
      type: "user",
      name: "New name",
      handle: "new-handle",
      profilePhotoUrl: "https://example.test/new.jpg",
    });
  });

  it("does not refetch inside the refresh interval", async () => {
    const now = 1_000_000;
    const token = createToken();
    token.userProfileRefreshedAt = now - USER_PROFILE_REFRESH_INTERVAL_SECONDS * 1000 + 1;

    await expect(refreshUserProfile(token, now)).resolves.toBe(token);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("keeps the last known profile when v1/me fails", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 503 }));
    const token = createToken();

    await expect(refreshUserProfile(token, 1_000_000)).resolves.toMatchObject({
      name: "Old name",
      user: { name: "Old name" },
      userProfileRefreshedAt: 1_000_000,
    });
  });
});
