import NextAuth, { type DefaultSession } from "next-auth";
import { OAuthConfig } from "next-auth/providers";
import { JWT } from "next-auth/jwt";

// カスタム OAuth プロバイダーの設定
const CustomOAuthProvider = {
  id: 'tokuly',
  name: 'Tokuly',
  type: 'oauth',
  authorization: { url: 'https://tokuly.com/oauth/authorize', params: { scope: 'live get-profile' } },
  token: 'https://tokuly.com/oauth/token',
  userinfo: {
    url: 'https://api.tokuly.com/v1/me',
    async request(context:any) {
      const res = await fetch('https://api.tokuly.com/v1/me', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${context.tokens.access_token}`,
        },
      });
      return res.json();
    },
  },
  clientId: process.env.AUTH_TOKULY_ID,
  clientSecret: process.env.AUTH_TOKULY_SECRET,
  profile(profile,token) {
    return {
      id: profile.id,
      name: profile?.name,
      email: profile?.email,
      image: profile?.profile_photo_url,
      access_token: token.access_token,
      refresh_token: token.refresh_token,
      expires_at: token.expires_at,
    }
  },
} as OAuthConfig<any>;

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    CustomOAuthProvider,
  ],
  callbacks: {
    async jwt({ token,user,account,session}): Promise<JWT | null> {
      //console.log('jwt user ', user);
      //console.log('jwt account ', account);
      if(account && user){
        return {
          ...token,
          access_token: account.access_token ?? '',
          expires_at: account.expires_at ?? 0,
          refresh_token: account.refresh_token,
          user:{
            ...user
          }
        }
      }
      if (account) {
        // First-time login, save the `access_token`, its expiry and the `refresh_token`
        return {
          ...token,
          access_token: account.access_token ?? '',
          expires_at: account.expires_at ?? 0,
          refresh_token: account.refresh_token,
        }
      } else if (Date.now() < token.expires_at * 1000) {
        // Subsequent logins, but the `access_token` is still valid
        return token
      } else {
        // Subsequent logins, but the `access_token` has expired, try to refresh it
        if (!token.refresh_token) throw new TypeError("Missing refresh_token")
 
        try {
          const response = await fetch("https://tokuly.com/oauth/token", {
            method: "POST",
            body: new URLSearchParams({
              client_id: process.env.AUTH_TOKULY_ID!,
              client_secret: process.env.AUTH_TOKULY_SECRET!,
              grant_type: "refresh_token",
              refresh_token: token.refresh_token!,
            }),
          })
 
          const tokensOrError = await response.json()
 
          if (!response.ok) throw tokensOrError
 
          const newTokens = tokensOrError as {
            access_token: string
            expires_in: number
            refresh_token?: string
          }
 
          token.access_token = newTokens.access_token
          token.expires_at = Math.floor(
            Date.now() / 1000 + newTokens.expires_in
          )
          // Some providers only issue refresh tokens once, so preserve if we did not get a new one
          if (newTokens.refresh_token)
            token.refresh_token = newTokens.refresh_token
          return token
        } catch (error) {
          console.error("Error refreshing access_token", error)
          // If we fail to refresh the token, return an error so we can handle it on the page
          token.error = "RefreshTokenError"
          return token
        }
      }
    },
    async session({ session, token }) {
      //console.log(token)
      session.error = token.error
      session.user.access_token = token.access_token;
      session.user.refresh_token = token.refresh_token;
      session.user.expires_at = token.expires_at;
      return session
    },
  },
});

declare module "next-auth" {
  interface Session {
    error?: "RefreshTokenError"
    user?: {
      id?: number,
      name?: string,
      email?: string,
      image?: string,
      access_token?: string,
      refresh_token?: string,
      expires_at?: number
      emailVerified? : boolean | null,
    }
  }
}
 
declare module "next-auth/jwt" {
  interface JWT {
    access_token: string
    expires_at: number
    refresh_token?: string
    error?: "RefreshTokenError"
  }
}
