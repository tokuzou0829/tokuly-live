"use client";
import { Button } from "@/components/ui/button";
import { claimGift, returnGift } from "@/requests/studio";
import { ExternalLink, Loader2 } from "lucide-react";
import { useState } from "react";
export default function GiftAction({
  id,
  token,
  type,
}: {
  id: number;
  token: string;
  type: "claim" | "return";
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  async function run() {
    if (
      loading ||
      !confirm(
        type === "claim"
          ? "ギフトを開きますか？開くとアクセス済みになります。"
          : "このギフトを返却しますか？"
      )
    )
      return;
    setLoading(true);
    setError("");
    try {
      const url = type === "claim" ? await claimGift(id, token) : await returnGift(id, token);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "操作できませんでした。");
    } finally {
      setLoading(false);
    }
  }
  return (
    <div>
      <Button onClick={run} disabled={loading} size="sm" variant="outline">
        {loading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <ExternalLink className="mr-2 h-4 w-4" />
        )}
        {type === "claim" ? "受け取る" : "返却"}
      </Button>
      {error && (
        <p role="alert" className="mt-1 max-w-56 text-xs font-semibold">
          {error}
        </p>
      )}
    </div>
  );
}
