"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { StudioStream } from "@/types/studio";
import { Check, Copy, ImageIcon, Search } from "lucide-react";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import StreamStatus from "./stream-status";
import { CHAT_CSS_MAX_LENGTH, CHAT_CSS_PRESETS, type ChatCssPresetId } from "./chat-embed-presets";

type CopyTarget = "url" | "css";

async function copyText(value: string) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value);
      return;
    } catch {
      // Clipboard APIが拒否された場合は従来方式を試す。
    }
  }

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  textarea.remove();
  if (!copied) throw new Error("コピーできませんでした");
}

function StreamThumbnail({ stream }: { stream: StudioStream }) {
  return (
    <div className="flex aspect-video w-full shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[var(--studio-subtle)]">
      {stream.thumbnail_url ? (
        <img
          src={stream.thumbnail_url}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover"
        />
      ) : (
        <ImageIcon aria-hidden="true" className="h-5 w-5 text-[var(--studio-muted)]" />
      )}
    </div>
  );
}

export default function ChatEmbedBuilder({ streams }: { streams: StudioStream[] }) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [streamQuery, setStreamQuery] = useState("");
  const [activePreset, setActivePreset] = useState<ChatCssPresetId | null>("bubble");
  const [css, setCss] = useState(CHAT_CSS_PRESETS.bubble.css);
  const [copied, setCopied] = useState<CopyTarget | null>(null);
  const [copyError, setCopyError] = useState<CopyTarget | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const copyTimerRef = useRef<number | null>(null);
  const selectedStream = streams.find((stream) => stream.id === selectedId) ?? null;
  const previewOrigin = typeof window === "undefined" ? "" : window.location.origin;
  const filteredStreams = useMemo(() => {
    const query = streamQuery.trim().toLocaleLowerCase("ja-JP");
    if (!query) return streams;
    return streams.filter((stream) => stream.title.toLocaleLowerCase("ja-JP").includes(query));
  }, [streamQuery, streams]);

  const sendPreviewCss = useCallback(() => {
    if (!iframeRef.current?.contentWindow || !previewOrigin) return;
    iframeRef.current.contentWindow.postMessage(
      { type: "tokuly:chat-css:update", version: 1, css },
      previewOrigin
    );
  }, [css, previewOrigin]);

  useEffect(() => {
    const timer = window.setTimeout(sendPreviewCss, 100);
    return () => window.clearTimeout(timer);
  }, [sendPreviewCss]);

  useEffect(() => {
    function handlePreviewReady(event: MessageEvent) {
      if (event.origin !== previewOrigin || event.source !== iframeRef.current?.contentWindow)
        return;
      if (event.data?.type !== "tokuly:chat-css:ready" || event.data.version !== 1) return;
      sendPreviewCss();
    }

    window.addEventListener("message", handlePreviewReady);
    return () => window.removeEventListener("message", handlePreviewReady);
  }, [previewOrigin, sendPreviewCss]);

  useEffect(
    () => () => {
      if (copyTimerRef.current) window.clearTimeout(copyTimerRef.current);
    },
    []
  );

  function selectStream(stream: StudioStream) {
    setSelectedId(stream.id);
    setPickerOpen(false);
    setStreamQuery("");
    setCopyError(null);
  }

  function applyPreset(preset: ChatCssPresetId) {
    setActivePreset(preset);
    setCss(CHAT_CSS_PRESETS[preset].css);
  }

  function handleCssChange(event: React.ChangeEvent<HTMLTextAreaElement>) {
    setActivePreset(null);
    setCss(event.target.value);
  }

  async function handleCopy(target: CopyTarget, value: string) {
    try {
      await copyText(value);
      setCopied(target);
      setCopyError(null);
      if (copyTimerRef.current) window.clearTimeout(copyTimerRef.current);
      copyTimerRef.current = window.setTimeout(() => setCopied(null), 1_500);
    } catch {
      setCopied(null);
      setCopyError(target);
    }
  }

  return (
    <div className="space-y-5">
      <section className="studio-card space-y-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-bold">対象の配信</h2>
          <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" disabled={streams.length === 0}>
                {streams.length === 0
                  ? "選択できる配信がありません"
                  : selectedStream
                    ? "配信を変更"
                    : "配信を選択"}
              </Button>
            </DialogTrigger>
            <DialogContent className="studio-theme grid max-h-[min(86vh,720px)] w-[calc(100%-1.5rem)] max-w-2xl grid-rows-[auto_auto_minmax(0,1fr)] gap-0 overflow-hidden bg-[var(--studio-surface)] p-0 text-[var(--studio-fg)]">
              <DialogHeader className="px-5 pb-4 pt-6 sm:px-6">
                <DialogTitle>配信を選択</DialogTitle>
                <DialogDescription>チャットを表示する配信を選択してください。</DialogDescription>
              </DialogHeader>
              <div className="border-y border-[var(--studio-border)] p-3 sm:px-6">
                <Label htmlFor="stream-search" className="sr-only">
                  配信を検索
                </Label>
                <div className="relative">
                  <Search
                    aria-hidden="true"
                    className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--studio-muted)]"
                  />
                  <Input
                    id="stream-search"
                    value={streamQuery}
                    onChange={(event) => setStreamQuery(event.target.value)}
                    placeholder="配信名で検索"
                    autoComplete="off"
                    className="pl-9"
                  />
                </div>
              </div>
              <div className="min-h-0 overflow-y-auto p-2 sm:p-3">
                {filteredStreams.map((stream) => {
                  const isSelected = stream.id === selectedId;
                  return (
                    <button
                      key={stream.id}
                      type="button"
                      onClick={() => selectStream(stream)}
                      aria-pressed={isSelected}
                      className="grid w-full min-w-0 grid-cols-[88px_minmax(0,1fr)_24px] items-center gap-3 overflow-hidden rounded-xl p-2 text-left hover:bg-[var(--studio-subtle)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--studio-accent)] sm:grid-cols-[120px_minmax(0,1fr)_24px]"
                    >
                      <StreamThumbnail stream={stream} />
                      <span className="min-w-0 overflow-hidden">
                        <strong className="line-clamp-2 block text-sm leading-5 [overflow-wrap:anywhere]">
                          {stream.title}
                        </strong>
                        <span className="mt-1 block">
                          <StreamStatus status={stream.status} />
                        </span>
                      </span>
                      <span className="flex h-6 w-6 items-center justify-center">
                        {isSelected && <Check aria-label="選択中" className="h-4 w-4" />}
                      </span>
                    </button>
                  );
                })}
                {filteredStreams.length === 0 && (
                  <p className="py-16 text-center text-sm text-[var(--studio-muted)]">
                    一致する配信がありません
                  </p>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {selectedStream && (
          <div className="flex min-w-0 items-center gap-3 rounded-lg bg-[var(--studio-subtle)] p-3">
            <div className="w-24 shrink-0">
              <StreamThumbnail stream={selectedStream} />
            </div>
            <div className="min-w-0 flex-1 overflow-hidden">
              <p className="line-clamp-2 text-sm font-semibold leading-5 [overflow-wrap:anywhere]">
                {selectedStream.title}
              </p>
              <div className="mt-1">
                <StreamStatus status={selectedStream.status} />
              </div>
            </div>
          </div>
        )}

        <div>
          <Label htmlFor="chat-embed-url">OBSブラウザURL</Label>
          <div className="mt-2 flex min-w-0 flex-col gap-2 sm:flex-row">
            <Input
              id="chat-embed-url"
              readOnly
              value={selectedStream?.urls.chat_embed ?? ""}
              placeholder="配信を選択するとURLが表示されます"
              className="min-w-0 flex-1 font-mono text-xs"
            />
            <Button
              type="button"
              disabled={!selectedStream}
              onClick={() => selectedStream && handleCopy("url", selectedStream.urls.chat_embed)}
            >
              {copied === "url" ? (
                <Check aria-hidden="true" className="mr-2 h-4 w-4" />
              ) : (
                <Copy aria-hidden="true" className="mr-2 h-4 w-4" />
              )}
              {copied === "url" ? "コピーしました" : "URLをコピー"}
            </Button>
          </div>
          <p className="mt-1 min-h-5 text-xs" aria-live="polite">
            {copied === "url" && <span className="text-green-700">URLをコピーしました。</span>}
            {copyError === "url" && (
              <span className="text-red-700">URLをコピーできませんでした。</span>
            )}
          </p>
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-bold">チャットの見た目</h2>
        <div className="flex flex-wrap gap-2" role="group" aria-label="サンプルCSSを選択">
          {(Object.keys(CHAT_CSS_PRESETS) as ChatCssPresetId[]).map((preset) => (
            <Button
              key={preset}
              type="button"
              size="sm"
              variant={activePreset === preset ? "default" : "outline"}
              aria-pressed={activePreset === preset}
              onClick={() => applyPreset(preset)}
            >
              {CHAT_CSS_PRESETS[preset].label}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid min-w-0 items-start gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
        <section
          className="studio-card min-w-0 overflow-hidden"
          aria-labelledby="chat-css-editor-label"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--studio-border)] px-4 py-3">
            <Label id="chat-css-editor-label" htmlFor="chat-css-editor" className="font-semibold">
              CSSエディター
            </Label>
            <div className="flex items-center gap-3">
              <span
                className="whitespace-nowrap text-xs tabular-nums text-[var(--studio-muted)]"
                aria-live="polite"
              >
                {css.length.toLocaleString("ja-JP")} / {CHAT_CSS_MAX_LENGTH.toLocaleString("ja-JP")}
              </span>
              <Button type="button" size="sm" onClick={() => handleCopy("css", css)}>
                {copied === "css" ? (
                  <Check aria-hidden="true" className="mr-2 h-4 w-4" />
                ) : (
                  <Copy aria-hidden="true" className="mr-2 h-4 w-4" />
                )}
                {copied === "css" ? "コピー済み" : "CSSをコピー"}
              </Button>
            </div>
          </div>
          <Textarea
            id="chat-css-editor"
            value={css}
            onChange={handleCssChange}
            maxLength={CHAT_CSS_MAX_LENGTH}
            spellCheck={false}
            aria-label="チャットのカスタムCSS"
            className="block h-[620px] resize-y rounded-none border-0 p-4 font-mono text-[13px] leading-6 shadow-none ring-offset-0 [tab-size:2] focus-visible:ring-0 max-xl:h-[440px]"
          />
          <div className="border-t border-[var(--studio-border)] px-4 py-2 text-xs text-[var(--studio-muted)]">
            <span>コピーしたCSSをOBSの「カスタムCSS」へ貼り付けてください。</span>
            <span className="ml-2" aria-live="polite">
              {copied === "css" && <span className="text-green-700">コピーしました。</span>}
              {copyError === "css" && (
                <span className="text-red-700">コピーできませんでした。</span>
              )}
            </span>
          </div>
        </section>

        <section
          className="studio-card min-w-0 overflow-hidden xl:sticky xl:top-20"
          aria-labelledby="chat-css-preview-label"
        >
          <div className="flex items-center justify-between border-b border-[var(--studio-border)] px-4 py-3">
            <h2 id="chat-css-preview-label" className="font-semibold">
              プレビュー
            </h2>
            <span className="text-xs text-[var(--studio-muted)]">リアルタイム</span>
          </div>
          <div className="bg-[var(--studio-subtle)] p-3">
            <iframe
              ref={iframeRef}
              src="/chat/test"
              title="チャットCSSプレビュー"
              onLoad={sendPreviewCss}
              className="block h-[620px] w-full rounded-lg border border-[var(--studio-border)] bg-transparent max-xl:h-[560px]"
            />
          </div>
        </section>
      </div>
    </div>
  );
}
