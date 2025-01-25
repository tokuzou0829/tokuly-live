import { auth, signOut, signIn } from "@/auth";

export default async function RootLayout({
    children,
  }: {
    children: React.ReactNode;
  }) {
    const session = await auth();
    const checkAuth = await fetch('https://api.tokuly.com/v1/me', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session?.user?.access_token}`,
      },
    });

    let isAuth = false;

    try {
      if(session){
        await checkAuth.json();
      }
      isAuth = true;
    } catch (e) {
      isAuth = false;
    } 

    return (
      <>
        {(session && isAuth) ?(
          <>
            {children}
          </>
        ):
        (
        <>
          {(isAuth) ? (
            <>
              <p>どうやらセッションの有効期限がきれてしまったようです。再ログインが必要です。</p>
              <form
                action={async () => {
                  "use server"
                  await signIn("tokuly");
                }}
              >
                <button type="submit">ログインする</button>
              </form>
            </>
          ) : (
            <>
            <p>ログインしてください</p>
            <form
                action={async () => {
                  "use server"
                  await signIn("tokuly");
                }}
              >
                <button type="submit">ログインする</button>
              </form>
            </>
          )}
        </>
        )}
      </>
    );
  }
  