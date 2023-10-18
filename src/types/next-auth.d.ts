import NextAuth, { DefaultSession } from "next-auth";
import { JWT } from "next-auth/jwt";

declare module "next-auth" {
  // クライアント側で使用するsession（useSessionから取得するオブジェクト）にプロパティを追加します。
  // ここでは`role`と`backendToken`を追加しています。
  interface Session {
    user: {
      token?: string | null| undefined;
    } & DefaultSession["user"];
    expires: ISODateString;
    token:string| null| undefined;
  }
  interface User {
    token?: string | null | undefined;
  }
}

declare module "next-auth/jwt" {
  // "jwt"コールバックのtokenパラメータに任意のプロパティを追加します。
  interface JWT {
    token?: string | null;
  }
}