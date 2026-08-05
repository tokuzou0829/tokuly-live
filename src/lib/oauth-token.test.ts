import { beforeEach, describe, expect, it, vi } from "vitest";
import type { JWT } from "next-auth/jwt";
import { refreshAccessToken } from "./oauth-token";

function expiredToken(overrides: Partial<JWT> = {}): JWT {
  return {
    access_token: "expired",
    expires_at: 1,
    refresh_token: "refresh",
    ...overrides,
  } as JWT;
}

describe("OAuth access token refresh", () => {
  beforeEach(() => vi.stubGlobal("fetch", vi.fn()));

  it("updates the access and rotated refresh tokens", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({ access_token: "new-access", expires_in: 3600, refresh_token: "rotated" }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );

    await expect(refreshAccessToken(expiredToken())).resolves.toMatchObject({
      access_token: "new-access",
      refresh_token: "rotated",
    });
  });

  it.each([expiredToken({ refresh_token: undefined }), expiredToken()])(
    "returns null so Auth.js clears the session when refresh fails",
    async (token) => {
      if (token.refresh_token) {
        vi.mocked(fetch).mockResolvedValue(
          new Response(JSON.stringify({ error: "invalid_grant" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          })
        );
      }
      await expect(refreshAccessToken(token)).resolves.toBeNull();
    }
  );

  it("returns null on network failure", async () => {
    vi.mocked(fetch).mockRejectedValue(new Error("network error"));
    await expect(refreshAccessToken(expiredToken())).resolves.toBeNull();
  });
});
