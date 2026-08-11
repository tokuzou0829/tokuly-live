import NextAuth from "next-auth";
import { OAuthConfig } from "next-auth/providers";
import { JWT } from "next-auth/jwt";
import {
  initialPostingIdentity,
  updatedPostingIdentity,
  userPostingIdentity,
} from "@/lib/posting-identity";
import { refreshAccessToken } from "@/lib/oauth-token";

// カスタム OAuth プロバイダーの設定
const CustomOAuthProvider = {
  id: "tokuly",
  name: "Tokuly",
  type: "oauth",
  authorization: {
    url: "https://tokuly.com/oauth/authorize",
    params: { scope: "live get-profile" },
  },
  icon: "https://assets.tokuly.com/tokuly.png",
  token: "https://tokuly.com/oauth/token",
  userinfo: {
    url: "https://api.tokuly.com/v1/me",
    async request(context: any) {
      const res = await fetch("https://api.tokuly.com/v1/me", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${context.tokens.access_token}`,
        },
      });
      return res.json();
    },
  },
  clientId: process.env.AUTH_TOKULY_ID,
  clientSecret: process.env.AUTH_TOKULY_SECRET,
  profile(profile, token) {
    return {
      id: profile.id,
      name: profile?.name,
      email: profile?.email,
      image: profile?.profile_photo_url,
      handle: profile?.handle,
      access_token: token.access_token,
      refresh_token: token.refresh_token,
      expires_at: token.expires_at,
    };
  },
} as OAuthConfig<any>;

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [CustomOAuthProvider],
  pages: {
    signIn: "/auth/signin",
  },
  callbacks: {
    async jwt({ token, user, account, session, trigger }): Promise<JWT | null> {
      //console.log('jwt user ', user);
      //console.log('jwt account ', account);
      if (account && user) {
        token = {
          ...token,
          access_token: account.access_token ?? "",
          expires_at: account.expires_at ?? 0,
          refresh_token: account.refresh_token,
          user: {
            ...user,
          },
        };
      } else if (account) {
        // First-time login, save the `access_token`, its expiry and the `refresh_token`
        token = {
          ...token,
          access_token: account.access_token ?? "",
          expires_at: account.expires_at ?? 0,
          refresh_token: account.refresh_token,
        };
      } else if (Math.floor(Date.now() / 1000) < token.expires_at) {
        // Subsequent logins, `access_token` is still valid
        //console.log(token.refresh_token)
        // The current access token can be used as-is.
      } else {
        // Subsequent logins, `access_token` has expired, try to refresh it
        const refreshedToken = await refreshAccessToken(token);
        if (!refreshedToken) return null;
        token = refreshedToken;
      }

      if (!token.postingIdentityInitialized) {
        token.activePostingIdentity = await initialPostingIdentity(token);
        token.postingIdentityInitialized = true;
      }

      if (trigger === "update" && session && "activeChannelId" in session) {
        const identity = await updatedPostingIdentity(
          token,
          (session as { activeChannelId?: unknown }).activeChannelId
        );
        if (identity) token.activePostingIdentity = identity;
      }

      return token;
    },
    async session({ session, token }) {
      //console.log(token)
      session.error = token.error;
      if (token.sub) session.user.id = token.sub;
      session.user.access_token = token.access_token;
      session.user.refresh_token = token.refresh_token;
      session.user.expires_at = token.expires_at;
      session.user.handle = token.user?.handle;
      session.activePostingIdentity = token.activePostingIdentity ?? userPostingIdentity(token);
      return session;
    },
  },
});
