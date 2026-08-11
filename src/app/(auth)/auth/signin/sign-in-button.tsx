"use client";

import React, { useState } from "react";
import { Loader2 } from "lucide-react";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";

export default function SignInButton({ callbackUrl }: { callbackUrl: string }) {
  const [isLoading, setIsLoading] = useState(false);

  async function handleSignIn() {
    if (isLoading) return;

    setIsLoading(true);
    try {
      await signIn("tokuly", { callbackUrl });
    } catch {
      setIsLoading(false);
    }
  }

  return (
    <Button
      type="button"
      size="lg"
      className="w-full"
      disabled={isLoading}
      aria-busy={isLoading}
      onClick={() => void handleSignIn()}
    >
      {isLoading ? (
        <>
          <Loader2 aria-hidden="true" className="mr-2 h-4 w-4 animate-spin" />
          移動しています…
        </>
      ) : (
        "Tokulyでログイン"
      )}
    </Button>
  );
}
