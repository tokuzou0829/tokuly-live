"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createStudioChannel, StudioApiError } from "@/requests/studio";
import type { StudioChannel } from "@/types/studio";
import { ImageIcon, Loader2, Plus, X } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";

const ACCEPTED_ICON_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_ICON_SIZE = 10 * 1024 * 1024;

export default function ChannelCreateDialog({
  token,
  defaultIconUrl,
  open,
  onOpenChange,
  blocking = false,
  onCreated,
}: {
  token: string;
  defaultIconUrl: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  blocking?: boolean;
  onCreated: (channel: StudioChannel) => void | Promise<void>;
}) {
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [fields, setFields] = useState<Record<string, string[]>>({});
  const [icon, setIcon] = useState<File | null>(null);
  const [iconPreview, setIconPreview] = useState<string | null>(null);
  const iconInput = useRef<HTMLInputElement>(null);
  const iconObjectUrl = useRef<string | null>(null);

  const clearPreview = () => {
    if (iconObjectUrl.current) {
      URL.revokeObjectURL(iconObjectUrl.current);
      iconObjectUrl.current = null;
    }
    setIcon(null);
    setIconPreview(null);
  };

  useEffect(
    () => () => {
      if (iconObjectUrl.current) URL.revokeObjectURL(iconObjectUrl.current);
    },
    []
  );

  const resetIcon = () => {
    if (iconInput.current) iconInput.current.value = "";
    clearPreview();
    setFields((current) => ({ ...current, icon: [] }));
  };

  const chooseIcon = (file?: File) => {
    clearPreview();
    setFields((current) => ({ ...current, icon: [] }));
    if (!file?.size) return;
    if (!ACCEPTED_ICON_TYPES.has(file.type)) {
      if (iconInput.current) iconInput.current.value = "";
      setFields((current) => ({
        ...current,
        icon: ["JPG、JPEG、PNG、WebP形式の画像を選択してください。"],
      }));
      return;
    }
    if (file.size > MAX_ICON_SIZE) {
      if (iconInput.current) iconInput.current.value = "";
      setFields((current) => ({
        ...current,
        icon: ["アイコン画像は10MB以下にしてください。"],
      }));
      return;
    }
    const preview = URL.createObjectURL(file);
    iconObjectUrl.current = preview;
    setIcon(file);
    setIconPreview(preview);
  };

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (creating) return;
    setCreating(true);
    setError("");
    setFields({});
    const form = new FormData(event.currentTarget);
    try {
      const channel = await createStudioChannel(
        {
          name: String(form.get("name") ?? "").trim(),
          handle: String(form.get("handle") ?? "").trim(),
          ...(icon ? { icon } : {}),
        },
        token
      );
      await onCreated(channel);
    } catch (caught) {
      if (caught instanceof StudioApiError) {
        setFields(caught.fields);
        if (caught.status !== 422 || Object.keys(caught.fields).length === 0) {
          setError(caught.message);
        }
      } else {
        setError(caught instanceof Error ? caught.message : "チャンネルを作成できませんでした。");
      }
      setCreating(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !blocking && onOpenChange(nextOpen)}>
      <DialogContent
        className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-xl"
        showCloseButton={!blocking}
        onEscapeKeyDown={blocking ? (event) => event.preventDefault() : undefined}
        onPointerDownOutside={blocking ? (event) => event.preventDefault() : undefined}
        onInteractOutside={blocking ? (event) => event.preventDefault() : undefined}
      >
        <form onSubmit={submit} className="space-y-5">
          <DialogHeader>
            <DialogTitle>新しいチャンネルを作成</DialogTitle>
            <DialogDescription>
              チャンネル名とハンドルを設定してください。アイコンは後から変更できます。
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-5 sm:grid-cols-[136px_minmax(0,1fr)] sm:items-start">
            <div>
              <Label htmlFor="channel-create-icon">アイコン（任意）</Label>
              <div className="mt-2 flex flex-col items-center gap-3">
                <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full bg-muted">
                  {iconPreview || defaultIconUrl ? (
                    <img
                      src={iconPreview ?? defaultIconUrl ?? ""}
                      alt={
                        iconPreview
                          ? "チャンネルアイコンのプレビュー"
                          : "デフォルトのチャンネルアイコン"
                      }
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <ImageIcon className="h-9 w-9 text-muted-foreground" />
                  )}
                </div>
                {iconPreview && (
                  <Button type="button" variant="outline" size="sm" onClick={resetIcon}>
                    <X className="mr-1 h-4 w-4" />
                    選択を取り消す
                  </Button>
                )}
              </div>
            </div>
            <div className="space-y-2 sm:pt-6">
              <Input
                ref={iconInput}
                id="channel-create-icon"
                name="icon"
                type="file"
                accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                className="h-auto py-2"
                onChange={(event) => chooseIcon(event.target.files?.[0])}
              />
              <p className="text-xs text-muted-foreground">JPG、JPEG、PNG、WebP形式、10MB以下</p>
              {fields.icon?.map((message) => (
                <p key={message} className="text-xs font-semibold" role="alert">
                  {message}
                </p>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="channel-create-name">チャンネル名</Label>
            <Input
              id="channel-create-name"
              name="name"
              required
              maxLength={32}
              autoFocus
              className="mt-2"
              placeholder="Tokuly Channel"
            />
            {fields.name?.map((message) => (
              <p key={message} className="mt-1 text-xs font-semibold" role="alert">
                {message}
              </p>
            ))}
          </div>

          <div>
            <Label htmlFor="channel-create-handle">ハンドル</Label>
            <div className="relative mt-2">
              <span className="absolute left-3 top-2.5 text-sm text-muted-foreground">@</span>
              <Input
                id="channel-create-handle"
                name="handle"
                required
                maxLength={32}
                pattern="[a-z0-9-]+"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                className="pl-7"
                placeholder="tokuly-channel"
              />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">小文字英数字とハイフンのみ</p>
            {fields.handle?.map((message) => (
              <p key={message} className="mt-1 text-xs font-semibold" role="alert">
                {message}
              </p>
            ))}
          </div>

          {error && (
            <p role="alert" className="rounded-lg border p-3 text-sm">
              {error}
            </p>
          )}

          <DialogFooter>
            {!blocking && (
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                キャンセル
              </Button>
            )}
            <Button disabled={creating}>
              {creating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              チャンネルを作成
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
