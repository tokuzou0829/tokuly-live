"use client";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { useEffect } from "react";
export default function StudioError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    /* 機密を含む可能性があるため本文は外部へ送信しない。 */
  }, [error]);
  return (
    <div className="studio-card mx-auto mt-20 flex max-w-lg flex-col items-center gap-4 p-10 text-center">
      <AlertTriangle className="h-10 w-10" />
      <div>
        <h1 className="text-xl font-bold">Studioを読み込めませんでした</h1>
        <p className="mt-2 text-sm text-[var(--studio-muted)]">
          ログイン権限または通信状態を確認して、もう一度お試しください。
        </p>
      </div>
      <Button onClick={reset}>
        <RefreshCw className="mr-2 h-4 w-4" />
        再試行
      </Button>
    </div>
  );
}
