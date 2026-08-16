"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { uploadVideoChunks, type VideoUploadPhase } from "@/lib/studio-upload";
import { createAutomaticVideoThumbnail } from "@/lib/studio-video-thumbnail";
import { createStudioStream, getUploadSession, StudioApiError } from "@/requests/studio";
import type { StudioStream, UploadSession } from "@/types/studio";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  FileVideo2,
  ImageIcon,
  Loader2,
  UploadCloud,
} from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useEffect, useRef, useState } from "react";

type WizardStep = "select" | "details" | "upload";
type ProgressPhase = "creating" | VideoUploadPhase;
type ThumbnailState = "idle" | "generating" | "ready" | "failed";

const phaseLabel: Record<ProgressPhase, string> = {
  creating: "動画枠を作成中…",
  hashing: "ファイルを確認中…",
  preparing: "アップロードを準備中…",
  uploading: "アップロード中",
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  let unit = units[0];
  for (let index = 1; index < units.length && value >= 1024; index += 1) {
    value /= 1024;
    unit = units[index];
  }
  return `${value.toFixed(value >= 10 ? 1 : 2)} ${unit}`;
}

export default function VideoUploadWizard({
  channelId,
  token,
}: {
  channelId: number;
  token: string;
}) {
  const router = useRouter();
  const [step, setStep] = useState<WizardStep>("select");
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [title, setTitle] = useState("");
  const [manualThumbnail, setManualThumbnail] = useState<File | null>(null);
  const [automaticThumbnail, setAutomaticThumbnail] = useState<File | null>(null);
  const [thumbnailState, setThumbnailState] = useState<ThumbnailState>("idle");
  const [thumbnailWarning, setThumbnailWarning] = useState("");
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [createdStream, setCreatedStream] = useState<StudioStream | null>(null);
  const [uploadSession, setUploadSession] = useState<UploadSession | null>(null);
  const [phase, setPhase] = useState<ProgressPhase>("creating");
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [titleError, setTitleError] = useState("");
  const abort = useRef<AbortController | null>(null);
  const thumbnailInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!file) return;
    let cancelled = false;
    setAutomaticThumbnail(null);
    setThumbnailState("generating");
    setThumbnailWarning("");
    createAutomaticVideoThumbnail(file)
      .then((thumbnail) => {
        if (cancelled) return;
        setAutomaticThumbnail(thumbnail);
        setThumbnailState("ready");
      })
      .catch(() => {
        if (cancelled) return;
        setThumbnailState("failed");
        setThumbnailWarning(
          "この動画からサムネイルを自動生成できませんでした。画像を選択するか、サムネイルなしで続行できます。"
        );
      });
    return () => {
      cancelled = true;
    };
  }, [file]);

  useEffect(() => {
    const thumbnail = manualThumbnail ?? automaticThumbnail;
    if (!thumbnail) {
      setThumbnailPreview(null);
      return;
    }
    const url = URL.createObjectURL(thumbnail);
    setThumbnailPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [automaticThumbnail, manualThumbnail]);

  useEffect(() => {
    if (!busy) return;
    const confirmLeave = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", confirmLeave);
    return () => window.removeEventListener("beforeunload", confirmLeave);
  }, [busy]);

  useEffect(() => () => abort.current?.abort(), []);

  const chooseFile = (nextFile?: File) => {
    if (!nextFile || busy) return;
    setFile(nextFile);
    setManualThumbnail(null);
    setError("");
    setTitleError("");
    setStep("details");
  };

  async function startUpload(event?: React.FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    if (!file || busy || !title.trim()) return;

    setBusy(true);
    setError("");
    setTitleError("");
    setProgress(0);
    setStep("upload");
    let stream = createdStream;
    let session = uploadSession;
    let hasCreatedFrame = Boolean(stream);
    const controller = new AbortController();
    abort.current = controller;

    try {
      if (!stream) {
        setPhase("creating");
        const thumbnail = manualThumbnail ?? automaticThumbnail;
        stream = await createStudioStream(
          channelId,
          { type: "video", title: title.trim(), ...(thumbnail ? { thumbnail } : {}) },
          token
        );
        hasCreatedFrame = true;
        setCreatedStream(stream);
      }
      if (!session) {
        setPhase("preparing");
        session = await getUploadSession(stream.id, token);
        setUploadSession(session);
      }
      await uploadVideoChunks(file, session, {
        signal: controller.signal,
        onPhase: setPhase,
        onProgress: setProgress,
      });
      router.replace(`/studio/videos/${stream.id}`);
    } catch (caught) {
      if (!hasCreatedFrame) setStep("details");
      if (caught instanceof StudioApiError) setTitleError(caught.fields.title?.[0] ?? "");
      setError(
        caught instanceof DOMException && caught.name === "AbortError"
          ? "アップロードを中止しました。同じ動画枠へ再試行できます。"
          : caught instanceof Error
            ? caught.message
            : "動画をアップロードできませんでした。"
      );
    } finally {
      setBusy(false);
      abort.current = null;
    }
  }

  return (
    <div
      className={`mx-auto w-full space-y-5 transition-[max-width] ${
        step === "select" ? "max-w-6xl" : "max-w-3xl"
      }`}
    >
      <ol className="grid grid-cols-3 gap-2" aria-label="アップロード手順">
        {[
          ["select", "1. 動画選択"],
          ["details", "2. 情報入力"],
          ["upload", "3. アップロード"],
        ].map(([value, label]) => {
          const order = { select: 0, details: 1, upload: 2 };
          const active = order[value as WizardStep] <= order[step];
          return (
            <li
              key={value}
              className={`rounded-lg px-3 py-2 text-center text-xs font-semibold sm:text-sm ${
                active
                  ? "bg-[var(--studio-fg)] text-[var(--studio-bg)]"
                  : "bg-[var(--studio-subtle)] text-[var(--studio-muted)]"
              }`}
            >
              {label}
            </li>
          );
        })}
      </ol>

      {step === "select" && (
        <section className="studio-card p-5 sm:p-8">
          <label
            className={`flex min-h-[420px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition-colors md:min-h-[520px] ${
              dragging
                ? "border-[var(--studio-accent)] bg-[var(--studio-subtle)]"
                : "border-[var(--studio-border)] hover:bg-[var(--studio-subtle)]"
            }`}
            onDragEnter={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragOver={(event) => event.preventDefault()}
            onDragLeave={(event) => {
              event.preventDefault();
              if (event.currentTarget === event.target) setDragging(false);
            }}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              chooseFile(event.dataTransfer.files[0]);
            }}
          >
            {file ? (
              <>
                <FileVideo2 className="mb-4 h-12 w-12 text-[var(--studio-accent)]" />
                <span className="max-w-full truncate text-lg font-bold">{file.name}</span>
                <span className="mt-2 text-sm text-[var(--studio-muted)]">
                  {formatFileSize(file.size)}・クリックまたはドロップで差し替え
                </span>
              </>
            ) : (
              <>
                <UploadCloud className="mb-4 h-12 w-12 text-[var(--studio-accent)]" />
                <span className="text-lg font-bold">動画ファイルをドラッグ＆ドロップ</span>
                <span className="mt-2 text-sm text-[var(--studio-muted)]">
                  またはクリックして選択
                </span>
              </>
            )}
            <Input
              type="file"
              accept="video/*"
              className="sr-only"
              onChange={(event) => chooseFile(event.target.files?.[0])}
            />
          </label>
          <p className="mt-4 text-center text-xs text-[var(--studio-muted)]">
            対応動画形式: MP4, MOV, etc...
          </p>
          {file && (
            <div className="mt-5 flex justify-end">
              <Button type="button" onClick={() => setStep("details")}>
                この動画で続ける
              </Button>
            </div>
          )}
        </section>
      )}

      {step === "details" && file && (
        <form onSubmit={startUpload} className="studio-card space-y-6 p-5 sm:p-8">
          <div className="flex items-center gap-3 rounded-xl bg-[var(--studio-subtle)] p-4">
            <FileVideo2 className="h-8 w-8 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{file.name}</p>
              <p className="mt-1 text-xs text-[var(--studio-muted)]">{formatFileSize(file.size)}</p>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={() => setStep("select")}>
              差し替え
            </Button>
          </div>

          <div>
            <Label htmlFor="video-title">タイトル</Label>
            <Input
              id="video-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={64}
              required
              autoFocus
              className="mt-2 h-12 text-base"
              placeholder="動画タイトルを入力"
            />
            {titleError && <p className="mt-1 text-sm font-semibold">{titleError}</p>}
          </div>

          <div>
            <Label htmlFor="video-thumbnail">サムネイル（任意）</Label>
            <div className="mt-2 grid gap-4 sm:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
              <div className="aspect-video overflow-hidden rounded-xl bg-black">
                {thumbnailPreview ? (
                  <img
                    src={thumbnailPreview}
                    alt="サムネイルプレビュー"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center px-4 text-center text-sm text-white/70">
                    {thumbnailState === "generating" ? (
                      <>
                        <Loader2 className="mb-2 h-7 w-7 animate-spin" />
                        動画から自動生成中…
                      </>
                    ) : (
                      <>
                        <ImageIcon className="mb-2 h-7 w-7" />
                        サムネイルなし
                      </>
                    )}
                  </div>
                )}
              </div>
              <div>
                <Input
                  ref={thumbnailInput}
                  id="video-thumbnail"
                  type="file"
                  accept="image/jpeg,image/png"
                  className="h-auto py-2"
                  onChange={(event) => setManualThumbnail(event.target.files?.[0] ?? null)}
                />
                <p className="mt-2 text-xs text-[var(--studio-muted)]">
                  サムネイル推奨サイズ:1920x180px
                </p>
                {manualThumbnail && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => {
                      setManualThumbnail(null);
                      if (thumbnailInput.current) thumbnailInput.current.value = "";
                    }}
                  >
                    自動生成に戻す
                  </Button>
                )}
              </div>
            </div>
            {thumbnailWarning && (
              <p className="mt-3 flex items-start gap-2 rounded-lg bg-[var(--studio-subtle)] p-3 text-sm">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                {thumbnailWarning}
              </p>
            )}
          </div>

          {error && (
            <p role="alert" className="rounded-lg border border-[var(--studio-fg)] p-3 text-sm">
              {error}
            </p>
          )}
          <div className="flex justify-between gap-3">
            <Button type="button" variant="outline" onClick={() => setStep("select")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              戻る
            </Button>
            <Button
              disabled={
                busy || !title.trim() || (thumbnailState === "generating" && !manualThumbnail)
              }
            >
              続ける
            </Button>
          </div>
        </form>
      )}

      {step === "upload" && file && (
        <section className="studio-card p-6 sm:p-8">
          <div className="flex flex-col items-center text-center">
            {error && !busy ? (
              <AlertTriangle className="h-12 w-12" />
            ) : progress === 100 ? (
              <Check className="h-12 w-12" />
            ) : (
              <Loader2 className="h-12 w-12 animate-spin" />
            )}
            <h2 className="mt-4 text-lg font-bold">
              {busy
                ? phaseLabel[phase]
                : error
                  ? "アップロードを完了できませんでした"
                  : "完了しました"}
            </h2>
            <p className="mt-2 max-w-xl truncate text-sm text-[var(--studio-muted)]">{file.name}</p>
          </div>

          {phase === "uploading" && (
            <div className="mt-6">
              <div className="h-2 overflow-hidden rounded-full bg-[var(--studio-subtle)]">
                <div
                  className="h-full bg-[var(--studio-accent)] transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="mt-2 text-center text-sm font-semibold">{progress}%</p>
            </div>
          )}

          {error && (
            <p
              role="alert"
              className="mt-6 rounded-lg border border-[var(--studio-fg)] p-3 text-sm"
            >
              {error}
            </p>
          )}
          <div className="mt-6 flex justify-center gap-3">
            {busy ? (
              <Button type="button" variant="outline" onClick={() => abort.current?.abort()}>
                中止
              </Button>
            ) : error ? (
              <Button type="button" onClick={() => startUpload()}>
                もう一度試す
              </Button>
            ) : null}
          </div>
        </section>
      )}
    </div>
  );
}
