import NextAuth from 'next-auth'
import CredentialsProvider from "next-auth/providers/credentials"

export const  handler = NextAuth({
  secret: process.env.NEXTAUTH_SECRET,
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
        urlencoded.append("email", credentials.email);
        urlencoded.append("pass", credentials.password);

        var requestOptions = {
          method: 'POST',
          headers: myHeaders,
          body: urlencoded,
        };
        const res = await fetch("https://api.tokuly.com/auth/login", requestOptions)
        const token = await res.json();
        var myHeaders = new Headers();
        myHeaders.append("Content-Type", "application/x-www-form-urlencoded");

        var urlencoded = new URLSearchParams();
        urlencoded.append("token", token.token);

        var requestOptions = {
          method: 'POST',
          headers: myHeaders,
          body: urlencoded,
        };
        const user_res = await fetch("https://api.tokuly.com/auth/session", requestOptions)
        const user_data = await user_res.json();
        console.log(user);
        var user = user_data;
        user.image = user_data.profile_photo_url;
        if (user.result=="ok") {
          return user
        }
        return null
      },
    })
  ],
  pages: {
    signIn: '/auth/signin',
  },
  session: {
    strategy: 'jwt', // default
  },
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) { // 初回サインイン時にアカウント情報を取得できる
        token.id = user.id
        token.token = user.token
      }
      console.log(token)
      return token
    },
    session: async ({ session, token }) => {
      session.token = token.token
      return session
    }
  }
})
export { handler as GET, handler as POST }
