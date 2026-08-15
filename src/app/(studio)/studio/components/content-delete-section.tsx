"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { deleteStudioStream } from "@/requests/studio";
import type { StudioStream } from "@/types/studio";
import { Loader2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function ContentDeleteSection({
  stream,
  token,
}: {
  stream: StudioStream;
  token: string;
}) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");

  async function remove() {
    if (deleting) return;
    setDeleting(true);
    setError("");
    try {
      await deleteStudioStream(stream.id, token);
      setOpen(false);
      router.push("/studio/content");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "削除できませんでした。");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <section className="studio-card min-w-0 max-w-full p-4 sm:p-5">
      <h2 className="font-bold">コンテンツを削除</h2>
      <p className="mt-2 text-sm text-[var(--studio-muted)]">
        {stream.type === "live"
          ? "配信と関連するすべてのデータを削除します。"
          : "動画と関連するすべてのデータを削除します。"}
      </p>
      {error && (
        <p role="alert" className="mt-3 rounded-lg border border-[var(--studio-fg)] p-3 text-sm">
          {error}
        </p>
      )}
      <Button
        type="button"
        variant="outline"
        className="mt-4"
        onClick={() => {
          setError("");
          setOpen(true);
        }}
      >
        <Trash2 className="mr-2 h-4 w-4" />
        削除する
      </Button>

      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          if (!deleting) setOpen(nextOpen);
        }}
      >
        <DialogContent className="w-[calc(100%-2rem)] max-w-md">
          <DialogHeader>
            <DialogTitle>「{stream.title}」を削除しますか？</DialogTitle>
            <DialogDescription className="pt-2 leading-6">
              この{stream.type === "live" ? "配信" : "動画"}
              と関連データは完全に削除されます。この操作は取り消せません。
            </DialogDescription>
          </DialogHeader>
          {error && (
            <p role="alert" className="rounded-lg border border-current p-3 text-sm">
              {error}
            </p>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={deleting}>
                キャンセル
              </Button>
            </DialogClose>
            <Button type="button" onClick={remove} disabled={deleting}>
              {deleting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              完全に削除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
