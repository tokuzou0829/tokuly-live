"use client";

import { SessionProvider, signOut, useSession } from "next-auth/react";
import React, { ReactNode, useEffect, useRef } from "react";
import type { Session } from "next-auth";
import { TOKULY_UNAUTHORIZED_EVENT } from "@/lib/auth-session-events";

function AuthSessionGuard({ forceSignOut }: { forceSignOut: boolean }) {
  const { data: session } = useSession();
  const signingOut = useRef(false);

  useEffect(() => {
    const logout = () => {
      if (signingOut.current) return;
      signingOut.current = true;
      void signOut({ callbackUrl: "/" });
    };

    window.addEventListener(TOKULY_UNAUTHORIZED_EVENT, logout);
    if (forceSignOut || session?.error === "RefreshTokenError") logout();
    return () => window.removeEventListener(TOKULY_UNAUTHORIZED_EVENT, logout);
  }, [forceSignOut, session?.error]);

  return null;
}

const NextAuthProvider = ({
  children,
  session,
  forceSignOut = false,
}: {
  children: ReactNode;
  session: Session | null;
  forceSignOut?: boolean;
}) => {
  return (
    <SessionProvider session={session}>
      <AuthSessionGuard forceSignOut={forceSignOut} />
      {children}
    </SessionProvider>
  );
};

export default NextAuthProvider;
