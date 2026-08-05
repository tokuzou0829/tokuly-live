import { auth, signIn } from "@/auth";
import NextAuthProvider from "@/providers/NextAuth";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const checkAuth = session?.user?.access_token
    ? await fetch("https://api.tokuly.com/v1/me", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.user.access_token}` },
      })
    : null;
  const isAuth = Boolean(session && checkAuth?.ok);

  return (
    <NextAuthProvider session={session} forceSignOut={checkAuth?.status === 401}>
      {isAuth ? (
        children
      ) : (
        <>
          <p>
            {session
              ? "セッションの有効期限が切れました。再ログインが必要です。"
              : "ログインしてください。"}
          </p>
          <form
            action={async () => {
              "use server";
              await signIn("tokuly");
            }}
          >
            <button type="submit">ログインする</button>
          </form>
        </>
      )}
    </NextAuthProvider>
  );
}
