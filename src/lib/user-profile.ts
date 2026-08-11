import type { JWT } from "next-auth/jwt";

export const USER_PROFILE_REFRESH_INTERVAL_SECONDS = 5 * 60;

type UserProfileResponse = {
  id?: string | number;
  name?: string | null;
  email?: string | null;
  profile_photo_url?: string | null;
  handle?: string;
};

function apiUrl(path: string): string {
  const root = (process.env.NEXT_PUBLIC_API_ROOT ?? "https://api.tokuly.com").replace(/\/+$/, "");
  return `${root}${path}`;
}

export async function refreshUserProfile(token: JWT, now = Date.now()): Promise<JWT> {
  const lastAttempt = token.userProfileRefreshedAt ?? 0;
  if (now - lastAttempt < USER_PROFILE_REFRESH_INTERVAL_SECONDS * 1000) return token;

  // Record attempts as well as successes so a temporary API failure cannot cause every
  // session read to retry immediately.
  token.userProfileRefreshedAt = now;

  try {
    const response = await fetch(apiUrl("/v1/me"), {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token.access_token}`,
      },
    });
    if (!response.ok) return token;

    const profile = (await response.json()) as UserProfileResponse;
    const id = profile.id == null ? undefined : String(profile.id);
    token.user = {
      ...token.user,
      ...(id === undefined ? {} : { id }),
      ...(profile.name === undefined ? {} : { name: profile.name }),
      ...(profile.email === undefined ? {} : { email: profile.email }),
      ...(profile.profile_photo_url === undefined ? {} : { image: profile.profile_photo_url }),
      ...(profile.handle === undefined ? {} : { handle: profile.handle }),
    };

    if (id !== undefined) token.sub = id;
    if (profile.name !== undefined) token.name = profile.name;
    if (profile.email !== undefined) token.email = profile.email;
    if (profile.profile_photo_url !== undefined) token.picture = profile.profile_photo_url;

    if (token.activePostingIdentity?.type === "user") {
      token.activePostingIdentity = {
        ...token.activePostingIdentity,
        accountId: String(token.user.id ?? token.sub ?? ""),
        name: token.user.name ?? "Tokulyユーザー",
        handle: token.user.handle ?? "",
        profilePhotoUrl: token.user.image ?? null,
      };
    }
  } catch {
    // Keep serving the last known profile when the profile API is temporarily unavailable.
  }

  return token;
}
