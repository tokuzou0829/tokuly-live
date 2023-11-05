import NextAuth, { DefaultSession } from "next-auth";
import { JWT } from "next-auth/jwt";

declare module "next-auth" {
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
    interface JWT {
    token?: string | null;
  }
}