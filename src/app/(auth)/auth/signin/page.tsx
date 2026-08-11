import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import React from "react";
import SignInButton from "./sign-in-button";

export const metadata: Metadata = {
  title: "ログイン | Tokuly Live",
  description: "Tokuly Liveへのログイン",
  robots: {
    index: false,
    follow: false,
  },
};

type SignInPageProps = {
  searchParams?: {
    callbackUrl?: string | string[];
    error?: string | string[];
  };
};

export default function SignInPage({ searchParams }: SignInPageProps) {
  const callbackUrl =
    typeof searchParams?.callbackUrl === "string" ? searchParams.callbackUrl : "/";
  const hasError = typeof searchParams?.error === "string";

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <section
        aria-labelledby="signin-title"
        className="w-full max-w-[400px] rounded-xl border bg-white p-6 shadow-sm sm:p-8"
      >
        <div className="flex flex-col items-center text-center">
          <Image
            src="/tokuly.png"
            alt="Tokuly"
            width={72}
            height={72}
            priority
            className="rounded-xl"
          />
          <h1 id="signin-title" className="mt-5 text-2xl font-semibold tracking-tight">
            Tokuly Liveにログイン
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Tokulyアカウントを使ってログインします
          </p>
        </div>

        {hasError && (
          <p
            role="alert"
            className="mt-6 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
          >
            ログインを完了できませんでした。もう一度お試しください。
          </p>
        )}

        <div className="mt-6">
          <SignInButton callbackUrl={callbackUrl} />
        </div>

        <div className="mt-6 text-center">
          <Link
            href="/"
            className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            ホームに戻る
          </Link>
        </div>
      </section>
    </main>
  );
}
