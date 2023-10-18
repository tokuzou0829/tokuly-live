import NextAuth from 'next-auth'
import CredentialsProvider from "next-auth/providers/credentials"

export const  handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: 'Tokuly',
      credentials: {
        email: { label: "email", type: "email", placeholder: "a@a.com" },
        password: { label: "password", type: "password" }
      },
      async authorize(credentials, req) {
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
    async jwt({ token, user }){
      if (user) { 
        token.token = user.token;
      }
      console.log("token:")
      console.log(token);
      return token
    },
    async session({ session, user, token }) {
          console.log("user:")
          session.user.token = token.token;
          session.token = token.token;
          console.log(session)
          return session;
    },
  }
})

export { handler as GET, handler as POST }
