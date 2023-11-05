import NextAuth, { type DefaultSession } from "next-auth"
import { JWT } from "next-auth/jwt";

declare module "next-auth/jwt" {
  interface JWT {
      name: string,
      email: string,
      picture: string,
      sub: number,
      token?: string| null| undefined;
  }
}
declare module "next-auth" {
  /**
   * Returned by `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
   */
  interface Session {
    user: {
      /** The user's postal address. */
      token: string| null| undefined;
      // By default, TypeScript merges new interface properties and overwrite existing ones. In this case, the default session user properties will be overwritten, with the new one defined above. To keep the default session user properties, you need to add them back into the newly declared interface
    } & DefaultSession["user"] // To keep the default types
  }
}

import CredentialsProvider from "next-auth/providers/credentials"

export const {
  handlers: { GET, POST },
  auth,
} = NextAuth({
  providers: [
    CredentialsProvider({
      name: 'Tokuly',
      credentials: {
        email: { label: "email", type: "email", placeholder: "a@a.com" },
        password: { label: "password", type: "password" }
      },
      async authorize(credentials:any, req) {
        var myHeaders = new Headers();
        myHeaders.append("Content-Type", "application/x-www-form-urlencoded");

        var urlencoded = new URLSearchParams();
        urlencoded.append("email", credentials?.email ?? "");
        urlencoded.append("pass", credentials?.password ?? "");

        var requestOptions = {
          method: 'POST',
          headers: myHeaders,
          body: urlencoded,
        };
        const res = await fetch("https://api.tokuly.com/auth/login", requestOptions)
        const tokenres = await res.json();
        var myHeaders = new Headers();
        myHeaders.append("Content-Type", "application/x-www-form-urlencoded");

        var urlencoded = new URLSearchParams();
        urlencoded.append("token", tokenres.token);

        var requestOptions = {
          method: 'POST',
          headers: myHeaders,
          body: urlencoded,
        };
        const user_res = await fetch("https://api.tokuly.com/auth/session", requestOptions)
        const user_data = await user_res.json();
        var user = user_data;
        console.log(user);
        user.image = user_data.profile_photo_url;
        if (user.result=="ok") {
          return user
        }else{
          return null
        }
      },
    })
  ],
  pages: {
    signIn: '/auth/signin',
  },
  session: {
    strategy: 'jwt',
  },
  jwt: {
    secret: process.env.NEXTAUTH_SECRET
  },
  callbacks: {
    async jwt({ token, user,account }:{token:any,user:any,account:any}){
      console.log("ac:")
      console.log(account)
      if (user) { 
        token.token = user.token;
      }
      console.log("token:")
      console.log(token);
      return token
    },
    async session({ session, token }: { session: any; token: any }) {
          console.log("user:")
          session.user.token = token.token;
          console.log(session)
          return session;
    },
  }
})