"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createStudioStream, StudioApiError } from "@/requests/studio";
import { ImageIcon, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useEffect, useRef, useState } from "react";

export default function CreateContentForm({
  type,
  channelId,
  token,
}: {
  type: "live" | "video";
  channelId: number;
  token: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldError, setFieldError] = useState("");
  const [thumbnail, setThumbnail] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const thumbnailInput = useRef<HTMLInputElement>(null);
  const thumbnailObjectUrl = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (thumbnailObjectUrl.current) URL.revokeObjectURL(thumbnailObjectUrl.current);
    };
  }, []);

  const previewThumbnail = (file?: File) => {
    if (thumbnailObjectUrl.current) {
      URL.revokeObjectURL(thumbnailObjectUrl.current);
      thumbnailObjectUrl.current = null;
    }
    if (!file?.size) {
      setThumbnail(null);
      setThumbnailPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    thumbnailObjectUrl.current = url;
    setThumbnail(file);
    setThumbnailPreview(url);
  };

  const resetThumbnail = () => {
    if (thumbnailInput.current) thumbnailInput.current.value = "";
    previewThumbnail();
  };

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setError("");
    setFieldError("");
    const form = new FormData(event.currentTarget);
    try {
      const stream = await createStudioStream(
        channelId,
        {
          type,
          title: String(form.get("title") ?? ""),
          ...(thumbnail ? { thumbnail } : {}),
        },
        token
      );
      router.push(
        type === "video" ? `/studio/videos/${stream.id}` : `/studio/streams/${stream.id}`
      );
    } catch (caught) {
      if (caught instanceof StudioApiError) setFieldError(caught.fields.title?.[0] ?? "");
      setError(caught instanceof Error ? caught.message : "作成できませんでした。");
      setLoading(false);
    }
  }
  return (
    <form onSubmit={submit} className="studio-card mx-auto max-w-2xl space-y-6 p-6 md:p-8">
      <h1 className="studio-title">新しいライブ配信</h1>
      <div>
        <Label htmlFor="title">タイトル</Label>
        <Input
          id="title"
          name="title"
          maxLength={64}
          required
          autoFocus
          className="mt-2 h-12 text-base"
          placeholder={type === "live" ? "配信タイトルを入力" : "動画タイトルを入力"}
        />
        {fieldError && <p className="mt-1 text-sm font-semibold">{fieldError}</p>}
      </div>
      <div>
        <Label htmlFor="thumbnail">サムネイル（任意）</Label>
        <div className="mt-2 grid gap-4 sm:grid-cols-[minmax(0,320px)_minmax(0,1fr)] sm:items-start">
          <div className="aspect-video overflow-hidden rounded-lg bg-black">
            {thumbnailPreview ? (
              <img
                src={thumbnailPreview}
                alt="サムネイルプレビュー"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center px-4 text-center text-sm text-white/70">
                <ImageIcon className="mb-2 h-7 w-7" />
                サムネイルは設定されていません
              </div>
            )}
          </div>
          <div>
            <Input
              ref={thumbnailInput}
              id="thumbnail"
              name="thumbnail"
              type="file"
              accept="image/jpeg,image/png"
              className="h-auto py-2"
              onChange={(event) => previewThumbnail(event.target.files?.[0])}
            />
            <p className="mt-2 text-xs text-[var(--studio-muted)]">
              JPEP,PNG,WebP形式の画像をアップロードできます。推奨サイズ：1280x720px
            </p>
            {thumbnailPreview && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={resetThumbnail}
              >
                選択を取り消す
              </Button>
            )}
          </div>
        </div>
      </div>
      {error && (
        <p role="alert" className="rounded-lg border border-[var(--studio-fg)] p-3 text-sm">
          {error}
        </p>
      )}
      <div className="flex justify-end">
        <Button disabled={loading} size="lg">
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {type === "live" ? "ライブ配信を作成" : "動画を作成してアップロードへ"}
        </Button>
      </div>
    </form>
  );
}
