"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { searchGames, StudioApiError, updateStudioStream } from "@/requests/studio";
import type { GameResult, StudioStream } from "@/types/studio";
import { studioPublishingSettings } from "@/lib/studio-publishing-settings";
import {
  AlertTriangle,
  Check,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  Loader2,
  Search,
} from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useEffect, useRef, useState } from "react";
import StudioPublicLink from "./studio-public-link";

export default function StreamEditor({
  stream,
  token,
  streamServerUrl,
}: {
  stream: StudioStream;
  token: string;
  streamServerUrl?: string | null;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [fields, setFields] = useState<Record<string, string[]>>({});
  const [query, setQuery] = useState("");
  const [games, setGames] = useState<GameResult[]>([]);
  const [game, setGame] = useState(stream.game);
  const [thumbnailPreview, setThumbnailPreview] = useState(stream.thumbnail_url);
  const [hasNewThumbnail, setHasNewThumbnail] = useState(false);
  const [isStreamKeyVisible, setIsStreamKeyVisible] = useState(false);
  const thumbnailInput = useRef<HTMLInputElement>(null);
  const thumbnailObjectUrl = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (thumbnailObjectUrl.current) URL.revokeObjectURL(thumbnailObjectUrl.current);
    };
  }, []);

  useEffect(() => {
    if (query.trim().length < 2) {
      setGames([]);
      return;
    }
    const timer = window.setTimeout(
      () =>
        searchGames(query.trim(), token)
          .then(setGames)
          .catch(() => setGames([])),
      350
    );
    return () => window.clearTimeout(timer);
  }, [query, token]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError("");
    setMessage("");
    setFields({});
    const form = new FormData(event.currentTarget);
    const thumbnail = form.get("thumbnail");
    const payload = {
      title: String(form.get("title") ?? ""),
      overview: String(form.get("overview") ?? "") || null,
      genre: String(form.get("genre") ?? "") || null,
      publishing_setting: String(form.get("publishing_setting") ?? "public"),
      live_thumbnail: form.get("live_thumbnail") === "on",
      gifts_enabled: form.get("gifts_enabled") === "on",
      game_name: game?.name ?? null,
      game_image_url: game?.image_url ?? null,
      igdb_id: game?.igdb_id ?? null,
    };
    try {
      await updateStudioStream(stream.id, payload, token);
      if (thumbnail instanceof File && thumbnail.size) {
        const image = new FormData();
        image.set("thumbnail", thumbnail);
        await updateStudioStream(stream.id, image, token);
      }
      setMessage("変更を保存しました。");
      router.refresh();
    } catch (caught) {
      if (caught instanceof StudioApiError) setFields(caught.fields);
      setError(caught instanceof Error ? caught.message : "保存できませんでした。");
    } finally {
      setSaving(false);
    }
  }

  const copy = (value: string) =>
    navigator.clipboard.writeText(value).then(() => setMessage("コピーしました。"));

  const previewThumbnail = (file?: File) => {
    if (thumbnailObjectUrl.current) {
      URL.revokeObjectURL(thumbnailObjectUrl.current);
      thumbnailObjectUrl.current = null;
    }
    if (!file?.size) {
      setThumbnailPreview(stream.thumbnail_url);
      setHasNewThumbnail(false);
      return;
    }
    const url = URL.createObjectURL(file);
    thumbnailObjectUrl.current = url;
    setThumbnailPreview(url);
    setHasNewThumbnail(true);
  };

  const resetThumbnail = () => {
    if (thumbnailInput.current) thumbnailInput.current.value = "";
    previewThumbnail();
  };

  return (
    <div className="min-w-0 max-w-full space-y-4">
      {stream.type === "live" && stream.status !== "end" && (
        <section className="studio-card min-w-0 max-w-full overflow-hidden p-4 sm:p-5">
          <h2 className="font-bold">配信方法</h2>
          {stream.stream_key_secret ? (
            <>
              <div className="mt-4 grid min-w-0 gap-3 md:grid-cols-2">
                <div className="min-w-0 rounded-xl bg-[var(--studio-subtle)] p-4">
                  <p className="studio-label">配信URL</p>
                  <div className="mt-2 flex min-w-0 items-center gap-2">
                    <Input
                      type="text"
                      value={streamServerUrl ?? ""}
                      readOnly
                      aria-label="配信URL"
                      placeholder="配信URLを取得できませんでした"
                      className="min-w-0 flex-1 border-0 bg-transparent px-2 font-mono shadow-none focus-visible:ring-1"
                    />
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="shrink-0"
                      onClick={() => streamServerUrl && copy(streamServerUrl)}
                      disabled={!streamServerUrl}
                      aria-label="配信URLをコピー"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="min-w-0 rounded-xl bg-[var(--studio-subtle)] p-4">
                  <p className="studio-label">ストリームキー</p>
                  <div className="mt-2 flex min-w-0 items-center gap-1">
                    <Input
                      type={isStreamKeyVisible ? "text" : "password"}
                      value={stream.stream_key_secret}
                      readOnly
                      autoComplete="off"
                      aria-label="ストリームキー"
                      className="min-w-0 flex-1 border-0 bg-transparent px-2 font-mono shadow-none focus-visible:ring-1"
                    />
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="shrink-0"
                      onClick={() => copy(stream.stream_key_secret!)}
                      aria-label="ストリームキーをコピー"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="shrink-0"
                      onClick={() => setIsStreamKeyVisible((visible) => !visible)}
                      aria-label={
                        isStreamKeyVisible ? "ストリームキーを隠す" : "ストリームキーを表示"
                      }
                      aria-pressed={isStreamKeyVisible}
                    >
                      {isStreamKeyVisible ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button asChild variant="outline">
                  <a href={stream.urls.browser_encoder}>
                    ブラウザから配信 <ExternalLink className="ml-2 h-4 w-4" />
                  </a>
                </Button>
              </div>
            </>
          ) : (
            <div
              role="alert"
              className="mt-4 flex items-start gap-3 rounded-xl border border-[var(--studio-fg)] p-4"
            >
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <p className="font-semibold">この配信は古い配信方式のため使用できません。</p>
                <p className="mt-1 text-sm">
                  配信を開始するには、新しいライブ配信を作成してください。
                </p>
                <Button asChild className="mt-3">
                  <a href="/studio/streams/new">新しいライブ配信を作成</a>
                </Button>
              </div>
            </div>
          )}
        </section>
      )}
      <form
        onSubmit={submit}
        className="studio-card min-w-0 max-w-full space-y-5 overflow-hidden p-4 sm:p-5"
      >
        <h2 className="font-bold">コンテンツ設定</h2>
        <StudioPublicLink stream={stream} />
        <div>
          <Label htmlFor="title">タイトル</Label>
          <Input
            id="title"
            name="title"
            defaultValue={stream.title}
            maxLength={64}
            required
            className="mt-2"
          />
          {fields.title?.map((value) => (
            <p key={value} className="mt-1 text-xs font-semibold">
              {value}
            </p>
          ))}
        </div>
        <div>
          <Label htmlFor="overview">概要</Label>
          <Textarea
            id="overview"
            name="overview"
            defaultValue={stream.overview ?? ""}
            maxLength={1000}
            className="mt-2 min-h-28"
          />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="publishing_setting">公開設定</Label>
            <select
              id="publishing_setting"
              name="publishing_setting"
              defaultValue={stream.publishing_setting}
              className="mt-2 h-10 w-full rounded-md border border-[var(--studio-border)] bg-[var(--studio-surface)] px-3 text-sm"
            >
              {studioPublishingSettings.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="genre">ジャンル</Label>
            <select
              id="genre"
              name="genre"
              defaultValue={stream.genre ?? ""}
              className="mt-2 h-10 w-full rounded-md border border-[var(--studio-border)] bg-[var(--studio-surface)] px-3 text-sm"
            >
              <option value="">未設定</option>
              <option value="game">ゲーム</option>
              <option value="talk">トーク</option>
              <option value="music">音楽</option>
              <option value="other">その他</option>
            </select>
          </div>
        </div>
        <div>
          <Label htmlFor="game-search">ゲーム</Label>
          {game ? (
            <div className="mt-2 flex min-w-0 items-center gap-3 rounded-lg bg-[var(--studio-subtle)] p-3">
              {game.image_url && (
                <img src={game.image_url} alt="" className="h-14 w-10 rounded object-cover" />
              )}
              <p className="min-w-0 flex-1 break-words font-semibold">{game.name}</p>
              <Button type="button" variant="ghost" size="sm" onClick={() => setGame(null)}>
                解除
              </Button>
            </div>
          ) : (
            <div className="relative mt-2">
              <Search className="absolute left-3 top-3 h-4 w-4 text-[var(--studio-muted)]" />
              <Input
                id="game-search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="ゲーム名を検索"
                className="pl-9"
              />
              {games.length > 0 && (
                <div className="absolute z-10 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-[var(--studio-border)] bg-[var(--studio-surface)] p-1 shadow-xl">
                  {games.map((result) => (
                    <button
                      type="button"
                      key={result.id}
                      className="flex w-full items-center gap-3 rounded-md p-2 text-left hover:bg-[var(--studio-subtle)]"
                      onClick={() => {
                        setGame({
                          igdb_id: String(result.id),
                          name: result.name,
                          image_url: result.cover_url,
                        });
                        setGames([]);
                        setQuery("");
                      }}
                    >
                      {result.cover_url && (
                        <img
                          src={result.cover_url}
                          alt=""
                          className="h-12 w-9 rounded object-cover"
                        />
                      )}
                      <span>{result.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        <div>
          <Label htmlFor="thumbnail">サムネイル</Label>
          <div className="mt-2 grid min-w-0 gap-4">
            <div className="aspect-video w-full max-w-80 overflow-hidden rounded-lg bg-black">
              {thumbnailPreview ? (
                <img
                  src={thumbnailPreview}
                  alt={`${stream.title}のサムネイルプレビュー`}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center px-4 text-center text-sm text-white/70">
                  サムネイルは設定されていません
                </div>
              )}
            </div>
            <div className="min-w-0">
              <Input
                ref={thumbnailInput}
                id="thumbnail"
                name="thumbnail"
                type="file"
                accept="image/jpeg,image/png"
                className="h-auto min-w-0 max-w-full py-2"
                onChange={(event) => previewThumbnail(event.target.files?.[0])}
              />
              <p className="mt-2 text-xs text-[var(--studio-muted)]">
                対応フォーマット: JPEGまたはPNG
              </p>
              {hasNewThumbnail && (
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
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex items-center justify-between rounded-lg bg-[var(--studio-subtle)] p-3 text-sm font-medium">
            ライブサムネイル
            <Switch name="live_thumbnail" defaultChecked={stream.live_thumbnail} />
          </label>
          <label className="flex items-center justify-between rounded-lg bg-[var(--studio-subtle)] p-3 text-sm font-medium">
            ギフト
            <Switch name="gifts_enabled" defaultChecked={stream.gifts_enabled} />
          </label>
        </div>
        {error && (
          <p role="alert" className="rounded-lg border border-[var(--studio-fg)] p-3 text-sm">
            {error}
          </p>
        )}
        {message && (
          <p role="status" className="flex items-center gap-2 text-sm font-semibold">
            <Check className="h-4 w-4" />
            {message}
          </p>
        )}
        <div className="flex justify-end">
          <Button disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}変更を保存
          </Button>
        </div>
      </form>
    </div>
  );
}
