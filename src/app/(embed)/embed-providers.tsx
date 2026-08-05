"use client";

import React from "react";
import type { Session } from "next-auth";
import { ArchivePlaybackProvider } from "@/app/(main)/video/[id]/archive-playback-context";
import NextAuthProvider from "@/providers/NextAuth";

export default function EmbedProviders({
  children,
  session,
}: {
  children: React.ReactNode;
  session: Session | null;
}) {
  return (
    <NextAuthProvider session={session}>
      <ArchivePlaybackProvider>{children}</ArchivePlaybackProvider>
    </NextAuthProvider>
  );
}
