import type { JWT } from "next-auth/jwt";

export async function refreshAccessToken(token: JWT): Promise<JWT | null> {
  if (!token.refresh_token) return null;

  try {
    const response = await fetch("https://tokuly.com/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: process.env.AUTH_TOKULY_ID!,
        client_secret: process.env.AUTH_TOKULY_SECRET!,
        grant_type: "refresh_token",
        refresh_token: token.refresh_token,
      }),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload || typeof payload.access_token !== "string") return null;

    token.access_token = payload.access_token;
    token.expires_at = Math.floor(Date.now() / 1000 + Number(payload.expires_in ?? 0));
    if (typeof payload.refresh_token === "string") token.refresh_token = payload.refresh_token;
    return token;
  } catch {
    return null;
  }
}
