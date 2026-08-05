import React from "react";
import { act, cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Session } from "next-auth";
import NextAuthProvider from "./NextAuth";
import { TOKULY_UNAUTHORIZED_EVENT } from "@/lib/auth-session-events";

const { signOut } = vi.hoisted(() => ({ signOut: vi.fn() }));
vi.mock("next-auth/react", () => ({
  SessionProvider: ({ children }: { children: React.ReactNode }) => children,
  useSession: () => ({ data: { user: {} } }),
  signOut,
}));

describe("NextAuthProvider", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("signs out once when an authenticated API reports 401", async () => {
    render(
      <NextAuthProvider session={{} as Session}>
        <div>content</div>
      </NextAuthProvider>
    );

    act(() => {
      window.dispatchEvent(new Event(TOKULY_UNAUTHORIZED_EVENT));
      window.dispatchEvent(new Event(TOKULY_UNAUTHORIZED_EVENT));
    });

    await waitFor(() => expect(signOut).toHaveBeenCalledWith({ callbackUrl: "/" }));
    expect(signOut).toHaveBeenCalledTimes(1);
  });
});
