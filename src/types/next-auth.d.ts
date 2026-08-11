import type { DefaultSession } from "next-auth";
import type { PostingIdentity } from "@/types/identity";

declare module "next-auth" {
  interface Session {
    error?: "RefreshTokenError";
    activePostingIdentity: PostingIdentity;
    user: DefaultSession["user"] & {
      id?: string;
      handle?: string;
      access_token?: string;
      refresh_token?: string;
      expires_at?: number;
    };
  }

  interface User {
    handle?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    access_token: string;
    expires_at: number;
    refresh_token?: string;
    error?: "RefreshTokenError";
    activePostingIdentity?: PostingIdentity;
    postingIdentityInitialized?: boolean;
    userProfileRefreshedAt?: number;
    user?: {
      id?: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      handle?: string;
    };
  }
}
