"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getUploadSession } from "@/requests/studio";
import { uploadVideoChunks, type VideoUploadPhase } from "@/lib/studio-upload";
import type { UploadSession } from "@/types/studio";
import { CheckCircle2, Loader2, UploadCloud } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const stateLabel: Record<string, string> = {
  waiting: "ファイル待ち",
  file_hash_not_much: "ファイルのハッシュが一致しません",
  encode_queue: "エンコード待ち",
  encode: "エンコード中",
  complete: "公開準備完了",
  error: "処理に失敗しました",
  upload: "ファイルの確認中"
};

const terminalStates = new Set(["complete", "error", "file_hash_not_much"]);

export default function VideoUploader({
  streamId,
  token,
  initial,
}: {
  streamId: number;
  token: string;
  initial: UploadSession;
}) {
  const router = useRouter();
  const [session, setSession] = useState(initial);
  const [uploading, setUploading] = useState(false);
  const [uploadPhase, setUploadPhase] = useState<VideoUploadPhase | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const abort = useRef<AbortController | null>(null);
  const processing = !terminalStates.has(session.state);
  useEffect(() => {
    if (!processing) return;
    let cancelled = false;
    let timer: number | undefined;

    const poll = async () => {
      try {
        const nextSession = await getUploadSession(streamId, token);
        if (cancelled) return;
        setSession(nextSession);
        if (terminalStates.has(nextSession.state)) {
          router.refresh();
          return;
        }
      } catch {
        if (cancelled) return;
      }
      timer = window.setTimeout(poll, 5_000);
    };

    timer = window.setTimeout(poll, 5_000);
    return () => {
      cancelled = true;
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [processing, router, streamId, token]);
  useEffect(() => () => abort.current?.abort(), []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (uploading) return;
    const file = new FormData(event.currentTarget).get("video");
    if (!(file instanceof File) || !file.size) return;
    setUploading(true);
    setError("");
    setProgress(0);
    setUploadPhase("hashing");
    abort.current = new AbortController();
    try {
      await uploadVideoChunks(file, session, {
        onPhase: setUploadPhase,
        onProgress: setProgress,
        signal: abort.current.signal,
      });
      const nextSession = await getUploadSession(streamId, token);
      setSession(nextSession);
      if (terminalStates.has(nextSession.state)) router.refresh();
    } catch (caught) {
      if (!(caught instanceof DOMException && caught.name === "AbortError"))
        setError(caught instanceof Error ? caught.message : "転送に失敗しました。");
    } finally {
      setUploading(false);
      setUploadPhase(null);
      abort.current = null;
    }
  }

  return (
    <section className="studio-card min-w-0 max-w-full overflow-hidden p-4 sm:p-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold">動画ファイル</h2>
          <p className="mt-1 text-sm text-[var(--studio-muted)]">
            {stateLabel[session.state] ?? `処理状態: ${session.state}`}
          </p>
        </div>
        {session.state === "complete" ? (
          <CheckCircle2 className="h-7 w-7" />
        ) : processing ? (
          <Loader2 className="h-6 w-6 animate-spin text-[var(--studio-accent)]" />
        ) : null}
      </div>
      {session.state === "waiting" && (
        <form onSubmit={submit} className="mt-5 space-y-4">
          <label className="flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-[var(--studio-border)] bg-[var(--studio-subtle)] p-6 text-center">
            <UploadCloud className="mb-3 h-9 w-9 text-[var(--studio-accent)]" />
            <span className="font-semibold">動画ファイルを選択</span>
            <span className="mt-1 text-xs text-[var(--studio-muted)]">
              動画ファイルを選択してください
            </span>
            <Input
              className="mt-4 h-auto w-full min-w-0 max-w-md py-2"
              name="video"
              type="file"
              accept="video/*"
              required
              disabled={uploading}
            />
          </label>
          {uploading && (
            <div>
              <div className="h-2 overflow-hidden rounded-full bg-[var(--studio-subtle)]">
                <div
                  className="h-full bg-[var(--studio-accent)] transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="mt-2 text-center text-sm">
                {uploadPhase === "hashing"
                  ? "ファイルを確認中…"
                  : uploadPhase === "preparing"
                    ? "アップロードを準備中…"
                    : `転送中 ${progress}%`}
              </p>
            </div>
          )}
          <div className="flex justify-end gap-2">
            {uploading && (
              <Button type="button" variant="outline" onClick={() => abort.current?.abort()}>
                中止
              </Button>
            )}
            <Button disabled={uploading}>
              {uploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}アップロード開始
            </Button>
          </div>
        </form>
      )}
      {error && (
        <p role="alert" className="mt-4 rounded-lg border border-[var(--studio-fg)] p-3 text-sm">
          {error}
        </p>
      )}
    </section>
  );
}
