"use client";

import * as SliderPrimitive from "@radix-ui/react-slider";
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
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import {
  buildCreateClipPayload,
  clipTicksToSeconds,
  clipTimelineWindow,
  formatClipTime,
  initialClipRange,
  MAX_CLIP_TITLE_LENGTH,
  moveClipRange,
  parseClipTime,
  secondsToClipTicks,
  type ClipRange,
  updateClipRange,
} from "@/lib/clip";
import { createStudioClip, StudioApiError } from "@/requests/studio";
import { getOwnedChannels } from "@/requests/owned-channels";
import type { ClipResource } from "@/types/clip";
import type { ChannelPostingIdentity, OwnedChannel } from "@/types/identity";
import type { Live } from "@/types/live";
import type { StudioChannel } from "@/types/studio";
import ChannelCreateDialog from "@/components/channel-create-dialog";
import {
  CheckCircle2,
  ChevronDown,
  Crosshair,
  Loader2,
  Pause,
  Play,
  Scissors,
  Copy,
  ExternalLink,
  X,
} from "lucide-react";
import { signIn, useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useArchivePlayback } from "./archive-playback-context";

const FILMSTRIP_FRAMES = 8;
const TIMELINE_ZOOMS = [60, 120, 300] as const;
const TIMELINE_HANDLE_HIT_WIDTH = 28;
export type ClipEditorMode = "mobile" | "anchored" | "sidebar";

export function resolveClipEditorMode(width: number): ClipEditorMode {
  if (width < 640) return "mobile";
  if (width < 1280) return "anchored";
  return "sidebar";
}

function ChannelSelectDialog({
  open,
  channels,
  loading,
  error,
  selectingChannelId,
  onOpenChange,
  onSelect,
  onRetry,
}: {
  open: boolean;
  channels: OwnedChannel[];
  loading: boolean;
  error: string;
  selectingChannelId: number | null;
  onOpenChange: (open: boolean) => void;
  onSelect: (channel: OwnedChannel) => void;
  onRetry: () => void;
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => selectingChannelId === null && onOpenChange(nextOpen)}
    >
      <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>投稿チャンネルを選択</DialogTitle>
          <DialogDescription>クリップを投稿するチャンネルを選択してください。</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex min-h-32 items-center justify-center" aria-label="読み込み中">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : error ? (
          <div className="space-y-4">
            <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </p>
            <DialogFooter>
              <Button type="button" onClick={onRetry}>
                再試行
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="divide-y overflow-hidden rounded-lg border">
            {channels.map((channel) => {
              const selecting = selectingChannelId === channel.id;
              return (
                <button
                  key={channel.id}
                  type="button"
                  disabled={selectingChannelId !== null}
                  className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted/60 disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={() => onSelect(channel)}
                >
                  {channel.profile_photo_url ? (
                    <img
                      src={channel.profile_photo_url}
                      alt=""
                      className="h-9 w-9 shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold">
                      {channel.name.slice(0, 1)}
                    </div>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{channel.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      @{channel.handle}
                    </span>
                  </span>
                  {selecting && <Loader2 className="h-5 w-5 shrink-0 animate-spin" />}
                </button>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function FilmstripFrame({
  streamName,
  posterUrl,
  time,
}: {
  streamName: string;
  posterUrl: string;
  time: number;
}) {
  const tileSet = String(Math.floor(time / 125) + 1).padStart(3, "0");
  const tileIndex = Math.floor((time % 125) / 5);
  const tileX = tileIndex % 5;
  const tileY = Math.floor(tileIndex / 5);
  return (
    <div
      className="h-full flex-1 bg-cover bg-center"
      style={{ backgroundImage: posterUrl ? `url(${posterUrl})` : undefined }}
      aria-hidden="true"
    >
      <div
        className="h-full w-full"
        style={{
          backgroundImage: `url(https://live-data.tokuly.com/videos/hls/${streamName}/video_preview/video_preview_${tileSet}.jpg)`,
          backgroundPosition: `${-tileX * 160}px ${-tileY * 90}px`,
          backgroundRepeat: "no-repeat",
          backgroundSize: "800px 450px",
        }}
      />
    </div>
  );
}

function ClipTimeline({
  streamName,
  posterUrl,
  range,
  durationTicks,
  currentTime,
  zoomSeconds,
  windowFocus,
  onZoomChange,
  onWindowFocusChange,
  onWindowFocusCommit,
  onRangeChange,
  onRangeCommit,
}: {
  streamName: string;
  posterUrl: string;
  range: ClipRange;
  durationTicks: number;
  currentTime: number;
  zoomSeconds: number;
  windowFocus: number;
  onZoomChange: (seconds: number) => void;
  onWindowFocusChange: (ticks: number) => void;
  onWindowFocusCommit: (ticks: number) => void;
  onRangeChange: (range: ClipRange) => void;
  onRangeCommit: (ticks: number) => void;
}) {
  const dragState = useRef<{
    clientX: number;
    range: ClipRange;
    latest: ClipRange;
  } | null>(null);
  const [dragging, setDragging] = useState(false);
  const window = clipTimelineWindow(windowFocus, durationTicks, zoomSeconds * 10);
  const windowSize = window.end - window.start;
  const frameTimes = useMemo(
    () =>
      Array.from({ length: FILMSTRIP_FRAMES }, (_, index) =>
        clipTicksToSeconds(
          window.start + Math.round((windowSize * index) / Math.max(1, FILMSTRIP_FRAMES - 1))
        )
      ),
    [window.start, windowSize]
  );
  const startPercent = ((range.start - window.start) / windowSize) * 100;
  const widthPercent = ((range.end - range.start) / windowSize) * 100;
  const viewportLeft = (window.start / durationTicks) * 100;
  const viewportWidth = (windowSize / durationTicks) * 100;
  const selectionCenter = Math.round((range.start + range.end) / 2);
  const currentTimeTicks = secondsToClipTicks(currentTime);
  const playheadPercent =
    currentTimeTicks >= window.start && currentTimeTicks <= window.end
      ? ((currentTimeTicks - window.start) / windowSize) * 100
      : null;

  const moveSelectionTo = (targetCenter: number) => {
    const length = range.end - range.start;
    const center = Math.min(
      window.end - Math.ceil(length / 2),
      Math.max(window.start + Math.floor(length / 2), Math.round(targetCenter))
    );
    return moveClipRange(range, center, durationTicks);
  };

  return (
    <div className="space-y-4">
      <div>
        <div className="mb-2 flex items-center justify-between gap-3">
          <span className="text-xs font-semibold">動画全体から位置を選択</span>
          <span className="font-mono text-xs text-muted-foreground">
            {formatClipTime(durationTicks)}
          </span>
        </div>
        <SliderPrimitive.Root
          aria-label="動画全体でのクリップ位置"
          className="relative flex h-7 w-full touch-none select-none items-center"
          min={0}
          max={durationTicks}
          step={1}
          value={[selectionCenter]}
          onValueChange={(values) => onWindowFocusChange(values[0])}
          onValueCommit={(values) => onWindowFocusCommit(values[0])}
        >
          <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-slate-200">
            <span
              className="absolute inset-y-0 rounded-full bg-slate-500"
              style={{ left: `${viewportLeft}%`, width: `${Math.max(viewportWidth, 0.4)}%` }}
            />
          </SliderPrimitive.Track>
          <SliderPrimitive.Thumb
            aria-label="クリップ位置"
            className="block h-5 w-5 cursor-ew-resize rounded-full border-2 border-white bg-slate-950 shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          />
        </SliderPrimitive.Root>
        <div className="flex justify-between font-mono text-[11px] text-muted-foreground">
          <span>{formatClipTime(0)}</span>
          <span>{formatClipTime(durationTicks)}</span>
        </div>
      </div>

      <div>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-semibold">詳細タイムライン</span>
          <div
            className="flex rounded-lg bg-muted p-1"
            role="group"
            aria-label="タイムラインの表示範囲"
          >
            {TIMELINE_ZOOMS.map((seconds) => (
              <button
                key={seconds}
                type="button"
                className={`rounded-md px-2 py-1 text-xs font-semibold transition-colors ${
                  zoomSeconds === seconds ? "bg-background shadow-sm" : "text-muted-foreground"
                }`}
                onClick={() => onZoomChange(seconds)}
                aria-pressed={zoomSeconds === seconds}
              >
                {seconds < 60 ? `${seconds}秒` : `${seconds / 60}分`}
              </button>
            ))}
          </div>
        </div>
        <div className="relative h-24 overflow-hidden rounded-lg bg-slate-200">
          <div className="absolute inset-0 flex">
            {frameTimes.map((time, index) => (
              <FilmstripFrame
                key={`${index}-${time}`}
                streamName={streamName}
                posterUrl={posterUrl}
                time={time}
              />
            ))}
          </div>
          <div className="pointer-events-none absolute inset-0 bg-black/50" />
          <div
            className="pointer-events-none absolute inset-y-0 border-y-4 border-white bg-white/10"
            style={{ left: `${startPercent}%`, width: `${widthPercent}%` }}
          />
          {playheadPercent !== null && (
            <div
              data-testid="clip-playhead"
              className="pointer-events-none absolute inset-y-0 z-30 w-0.5 -translate-x-1/2 bg-red-500 shadow-sm"
              style={{ left: `${playheadPercent}%` }}
              aria-hidden="true"
            />
          )}
          <SliderPrimitive.Root
            aria-label="クリップ範囲"
            className="absolute inset-0 flex w-full touch-none select-none items-center"
            min={window.start}
            max={window.end}
            step={1}
            minStepsBetweenThumbs={1}
            value={[range.start, range.end]}
            onValueChange={(values) => {
              const changed = values[0] !== range.start ? "start" : "end";
              const next = updateClipRange(
                range,
                changed,
                changed === "start" ? values[0] : values[1],
                durationTicks
              );
              onRangeChange(next);
            }}
            onValueCommit={(values) => onRangeCommit(values[0])}
          >
            <SliderPrimitive.Track className="relative h-full w-full grow">
              <SliderPrimitive.Range className="absolute h-full" />
            </SliderPrimitive.Track>
            <SliderPrimitive.Thumb
              aria-label="開始位置"
              className="group relative z-40 block h-24 w-0 cursor-ew-resize touch-none focus-visible:outline-none"
            >
              <span
                className="absolute inset-y-0 left-1/2 w-7 -translate-x-1/2"
                aria-hidden="true"
              />
              <span className="pointer-events-none absolute inset-y-0 left-1/2 w-3 -translate-x-1/2 rounded-l-md border-2 border-white bg-slate-950 shadow-lg group-focus-visible:ring-2 group-focus-visible:ring-blue-500" />
            </SliderPrimitive.Thumb>
            <SliderPrimitive.Thumb
              aria-label="終了位置"
              className="group relative z-40 block h-24 w-0 cursor-ew-resize touch-none focus-visible:outline-none"
            >
              <span
                className="absolute inset-y-0 left-1/2 w-7 -translate-x-1/2"
                aria-hidden="true"
              />
              <span className="pointer-events-none absolute inset-y-0 left-1/2 w-3 -translate-x-1/2 rounded-r-md border-2 border-white bg-slate-950 shadow-lg group-focus-visible:ring-2 group-focus-visible:ring-blue-500" />
            </SliderPrimitive.Thumb>
          </SliderPrimitive.Root>
          <button
            type="button"
            aria-label="選択範囲を移動"
            title="選択範囲内をドラッグして移動"
            className={`absolute inset-y-1 z-20 touch-none rounded-sm bg-white/0 transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-400 ${
              dragging ? "cursor-grabbing" : "cursor-grab"
            }`}
            style={{
              left: `calc(${startPercent}% + ${TIMELINE_HANDLE_HIT_WIDTH / 2}px)`,
              width: `max(0px, calc(${widthPercent}% - ${TIMELINE_HANDLE_HIT_WIDTH}px))`,
            }}
            onPointerDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
              event.currentTarget.setPointerCapture(event.pointerId);
              dragState.current = { clientX: event.clientX, range, latest: range };
              setDragging(true);
            }}
            onPointerMove={(event) => {
              const state = dragState.current;
              if (!state) return;
              const width = event.currentTarget.parentElement?.getBoundingClientRect().width ?? 0;
              if (width <= 0) return;
              const delta = Math.round(((event.clientX - state.clientX) / width) * windowSize);
              const initialCenter = Math.round((state.range.start + state.range.end) / 2);
              const next = moveSelectionTo(initialCenter + delta);
              state.latest = next;
              onRangeChange(next);
            }}
            onPointerUp={(event) => {
              const state = dragState.current;
              if (!state) return;
              event.currentTarget.releasePointerCapture(event.pointerId);
              dragState.current = null;
              setDragging(false);
              onRangeCommit(state.latest.start);
            }}
            onPointerCancel={() => {
              dragState.current = null;
              setDragging(false);
            }}
            onKeyDown={(event) => {
              if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
              event.preventDefault();
              const direction = event.key === "ArrowRight" ? 1 : -1;
              const next = moveSelectionTo(selectionCenter + direction * (event.shiftKey ? 10 : 1));
              onRangeChange(next);
              onRangeCommit(next.start);
            }}
          />
        </div>
        <div className="mt-2 flex justify-between font-mono text-xs text-muted-foreground">
          <span>{formatClipTime(window.start)}</span>
          <span>{formatClipTime(window.end)}</span>
        </div>
      </div>
    </div>
  );
}

export default function ClipCreator({ live }: { live: Live }) {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const { currentTime, duration, seekTo, play, pause } = useArchivePlayback();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const checkingChannelsRef = useRef(false);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<ClipEditorMode>("anchored");
  const [sidebarTarget, setSidebarTarget] = useState<HTMLElement | null>(null);
  const [mobileTarget, setMobileTarget] = useState<HTMLElement | null>(null);
  const [anchoredMaxHeight, setAnchoredMaxHeight] = useState(480);
  const [title, setTitle] = useState("");
  const [editorStep, setEditorStep] = useState<"range" | "details">("range");
  const [timeDetailsOpen, setTimeDetailsOpen] = useState(false);
  const [range, setRange] = useState<ClipRange | null>(null);
  const [startText, setStartText] = useState("");
  const [endText, setEndText] = useState("");
  const [error, setError] = useState("");
  const [previewing, setPreviewing] = useState(false);
  const [created, setCreated] = useState<ClipResource | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [zoomSeconds, setZoomSeconds] = useState<number>(120);
  const [windowFocus, setWindowFocus] = useState(0);
  const [ownedChannels, setOwnedChannels] = useState<OwnedChannel[]>([]);
  const [checkingChannels, setCheckingChannels] = useState(false);
  const [channelSelectOpen, setChannelSelectOpen] = useState(false);
  const [channelCreateOpen, setChannelCreateOpen] = useState(false);
  const [channelSelectionError, setChannelSelectionError] = useState("");
  const [selectingChannelId, setSelectingChannelId] = useState<number | null>(null);
  const [postingChannelOverride, setPostingChannelOverride] =
    useState<ChannelPostingIdentity | null>(null);
  const effectiveDuration = duration > 0 ? duration : (live.duration_seconds ?? 0);
  const durationTicks = secondsToClipTicks(effectiveDuration);
  const sessionChannel =
    session?.activePostingIdentity?.type === "channel" ? session.activePostingIdentity : null;
  const activeChannel = sessionChannel ?? postingChannelOverride;

  useEffect(() => {
    const update = () => setMode(resolveClipEditorMode(window.innerWidth));
    update();
    setSidebarTarget(document.getElementById("clip-editor-slot"));
    setMobileTarget(document.getElementById("clip-mobile-editor-slot"));
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  useEffect(() => {
    if (!open || mode !== "anchored") return;

    const update = () => {
      const triggerTop = triggerRef.current?.getBoundingClientRect().top ?? window.innerHeight;
      setAnchoredMaxHeight(Math.max(96, Math.floor(triggerTop - 64 - 16)));
    };

    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [mode, open]);

  useEffect(() => {
    const stage = document.getElementById("clip-mobile-stage");
    if (!open || mode !== "mobile" || !stage) return;

    const previousBodyOverflow = document.body.style.overflow;
    stage.dataset.clipOpen = "true";
    document.body.style.overflow = "hidden";

    return () => {
      delete stage.dataset.clipOpen;
      document.body.style.overflow = previousBodyOverflow;
    };
  }, [mode, open]);

  const applyRange = useCallback(
    (next: ClipRange, seekTarget?: number) => {
      setRange(next);
      setStartText(formatClipTime(next.start));
      setEndText(formatClipTime(next.end));
      setError("");
      setPreviewing(false);
      setWindowFocus((current) => {
        const window = clipTimelineWindow(current, durationTicks, zoomSeconds * 10);
        return next.start < window.start || next.end > window.end
          ? Math.round((next.start + next.end) / 2)
          : current;
      });
      if (seekTarget !== undefined) seekTo(clipTicksToSeconds(seekTarget));
    },
    [durationTicks, seekTo, zoomSeconds]
  );

  const initialize = () => {
    const next = initialClipRange(currentTime, effectiveDuration);
    setTitle("");
    setEditorStep("range");
    setTimeDetailsOpen(false);
    setCreated(null);
    setSubmitting(false);
    setCopied(false);
    setError("");
    setPreviewing(false);
    setZoomSeconds(120);
    setRange(next);
    setStartText(next ? formatClipTime(next.start) : "");
    setEndText(next ? formatClipTime(next.end) : "");
    setWindowFocus(next ? Math.round((next.start + next.end) / 2) : 0);
  };

  useEffect(() => {
    if (!open || range || durationTicks <= 0) return;
    const next = initialClipRange(currentTime, effectiveDuration);
    if (next) applyRange(next);
  }, [applyRange, currentTime, durationTicks, effectiveDuration, open, range]);

  useEffect(() => {
    if (!previewing || !range) return;
    if (secondsToClipTicks(currentTime) >= range.end) {
      pause();
      seekTo(clipTicksToSeconds(range.end));
      setPreviewing(false);
    }
  }, [currentTime, pause, previewing, range, seekTo]);

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) initialize();
    else {
      setPreviewing(false);
      pause();
      window.requestAnimationFrame(() => triggerRef.current?.focus());
    }
  };

  const loadOwnedChannelsForClip = async () => {
    if (checkingChannelsRef.current) return;
    const token = session?.user?.access_token;
    if (!token) {
      setOwnedChannels([]);
      setChannelSelectionError("チャンネル一覧を取得するには、もう一度ログインしてください。");
      setChannelSelectOpen(true);
      return;
    }
    checkingChannelsRef.current = true;
    setCheckingChannels(true);
    setChannelSelectionError("");
    try {
      const channels = await getOwnedChannels(token);
      setOwnedChannels(channels);
      if (channels.length === 0) {
        setChannelSelectOpen(false);
        setChannelCreateOpen(true);
      } else {
        setChannelCreateOpen(false);
        setChannelSelectOpen(true);
      }
    } catch (caught) {
      setOwnedChannels([]);
      setChannelSelectionError(
        caught instanceof Error ? caught.message : "チャンネル一覧を取得できませんでした。"
      );
      setChannelSelectOpen(true);
    } finally {
      checkingChannelsRef.current = false;
      setCheckingChannels(false);
    }
  };

  const openClip = () => {
    if (open || checkingChannels) return;
    if (status !== "authenticated" || !session?.user || activeChannel) {
      handleOpenChange(true);
      return;
    }
    void loadOwnedChannelsForClip();
  };

  const activateClipChannel = async (
    channel: Pick<ChannelPostingIdentity, "channelId" | "name" | "handle" | "profilePhotoUrl">
  ) => {
    const updated = await update({ activeChannelId: channel.channelId });
    const selected =
      updated?.activePostingIdentity?.type === "channel"
        ? updated.activePostingIdentity.channelId
        : null;
    if (selected !== channel.channelId) {
      throw new Error("選択したチャンネルへ切り替えられませんでした。");
    }
    setPostingChannelOverride({
      type: "channel",
      accountId: String(session?.user?.id ?? ""),
      ...channel,
    });
    setChannelSelectOpen(false);
    setChannelCreateOpen(false);
    setChannelSelectionError("");
    handleOpenChange(true);
    router.refresh();
  };

  const selectClipChannel = async (channel: OwnedChannel) => {
    if (selectingChannelId !== null) return;
    setSelectingChannelId(channel.id);
    setChannelSelectionError("");
    try {
      await activateClipChannel({
        channelId: channel.id,
        name: channel.name,
        handle: channel.handle,
        profilePhotoUrl: channel.profile_photo_url,
      });
    } catch (caught) {
      setChannelSelectionError(
        caught instanceof Error ? caught.message : "チャンネルを選択できませんでした。"
      );
    } finally {
      setSelectingChannelId(null);
    }
  };

  const finishCreatingClipChannel = async (channel: StudioChannel) => {
    try {
      await activateClipChannel({
        channelId: channel.id,
        name: channel.name,
        handle: channel.handle,
        profilePhotoUrl: channel.icon_url ?? "",
      });
    } catch (caught) {
      throw new Error(
        caught instanceof Error ? caught.message : "作成したチャンネルを選択できませんでした。"
      );
    }
  };

  const commitTimeInput = (changed: "start" | "end") => {
    if (!range) return;
    const value = parseClipTime(changed === "start" ? startText : endText);
    if (value === null || value < 0 || value > durationTicks) {
      setError("時刻は MM:SS.s または HH:MM:SS.s 形式で動画内の値を入力してください。");
      setStartText(formatClipTime(range.start));
      setEndText(formatClipTime(range.end));
      return;
    }
    const next = updateClipRange(range, changed, value, durationTicks);
    applyRange(next, changed === "start" ? next.start : next.end);
  };

  const moveRangeTo = (targetTicks: number, shouldSeek = true) => {
    if (!range) return;
    const next = moveClipRange(range, targetTicks, durationTicks);
    setWindowFocus(Math.round((next.start + next.end) / 2));
    applyRange(next, shouldSeek ? next.start : undefined);
  };

  const togglePreview = async () => {
    if (!range) return;
    if (previewing) {
      pause();
      setPreviewing(false);
      return;
    }
    seekTo(clipTicksToSeconds(range.start));
    setPreviewing(true);
    try {
      await play();
    } catch {
      setPreviewing(false);
      setError("プレビューを再生できませんでした。プレイヤーから再生を開始してください。");
    }
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const token = session?.user?.access_token;
    if (!activeChannel || !range || durationTicks <= 0 || !token || submitting) return;
    const result = buildCreateClipPayload({
      streamId: live.id,
      title,
      range,
      durationTicks,
    });
    if (!result.payload) {
      setError(result.error ?? "入力内容を確認してください。");
      return;
    }
    pause();
    setPreviewing(false);
    setSubmitting(true);
    setError("");
    try {
      const clip = await createStudioClip(activeChannel.channelId, result.payload, token);
      setCreated(clip);
      router.refresh();
    } catch (caught) {
      if (caught instanceof StudioApiError) {
        const fieldMessage = Object.values(caught.fields).flat()[0];
        setError(fieldMessage ?? caught.message);
      } else {
        setError(caught instanceof Error ? caught.message : "クリップを作成できませんでした。");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const panel = (
    <div className="flex min-h-full flex-col">
      <div className="flex items-start gap-3 border-b px-5 py-4">
        <div className="min-w-0 flex-1">
          <h2 id="clip-editor-heading" className="flex items-center gap-2 text-lg font-bold">
            <Scissors className="h-5 w-5" aria-hidden="true" />
            クリップを作成
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {editorStep === "range"
              ? "1/2 切り抜く範囲を選択します。"
              : "2/2 投稿先とタイトルを確認します。"}
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="shrink-0"
          onClick={() => handleOpenChange(false)}
          aria-label="クリップ編集を閉じる"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      {status === "loading" ? (
        <div
          className="flex min-h-64 flex-1 items-center justify-center p-8"
          aria-label="読み込み中"
        >
          <Loader2 className="h-7 w-7 animate-spin" />
        </div>
      ) : !session?.user ? (
        <div className="flex min-h-72 flex-1 flex-col items-center justify-center p-8 text-center">
          <h3 className="text-lg font-bold">ログインが必要です</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            クリップを投稿するにはTokulyへログインしてください。
          </p>
          <Button className="mt-5" onClick={() => signIn("tokuly")}>
            ログイン
          </Button>
        </div>
      ) : !activeChannel ? (
        <div className="flex min-h-72 flex-1 flex-col items-center justify-center p-8 text-center">
          <Scissors className="mb-4 h-10 w-10 text-muted-foreground" />
          <h3 className="text-lg font-bold">投稿チャンネルを選択してください</h3>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            画面上部のアカウントメニューから所有チャンネルへ切り替えてください。
          </p>
        </div>
      ) : created ? (
        <div className="flex min-h-96 flex-1 flex-col p-6">
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <CheckCircle2 className="mb-4 h-12 w-12 text-emerald-600" />
            <h3 className="text-xl font-bold">クリップを作成しました</h3>
            <img
              src={created.thumbnail_url}
              alt=""
              className="mt-5 aspect-video w-full rounded-xl bg-black object-cover"
            />
            <dl className="mt-6 w-full rounded-xl border bg-muted/30 p-4 text-left text-sm">
              <div className="border-b pb-3">
                <dt className="text-xs text-muted-foreground">タイトル</dt>
                <dd className="mt-1 break-words font-semibold">{created.title}</dd>
              </div>
              <div className="grid grid-cols-2 gap-4 border-b py-3">
                <div>
                  <dt className="text-xs text-muted-foreground">開始</dt>
                  <dd className="mt-1 font-mono">
                    {formatClipTime(secondsToClipTicks(created.start_seconds))}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">終了</dt>
                  <dd className="mt-1 font-mono">
                    {formatClipTime(secondsToClipTicks(created.end_seconds))}
                  </dd>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-3">
                <div>
                  <dt className="text-xs text-muted-foreground">長さ</dt>
                  <dd className="mt-1 font-semibold">{created.duration_seconds.toFixed(1)}秒</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">投稿先</dt>
                  <dd className="mt-1 truncate font-semibold">
                    {created.creator_channel?.name ?? "チャンネル情報なし"}
                  </dd>
                </div>
              </div>
            </dl>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <Button
              type="button"
              variant="outline"
              onClick={async () => {
                await navigator.clipboard.writeText(
                  `${window.location.origin}/clip/${created.clip_key}`
                );
                setCopied(true);
              }}
            >
              <Copy className="mr-2 h-4 w-4" />
              {copied ? "コピーしました" : "リンクをコピー"}
            </Button>
            <Button asChild>
              <Link href={`/clip/${created.clip_key}`}>
                <ExternalLink className="mr-2 h-4 w-4" />
                クリップを見る
              </Link>
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="sm:col-span-2"
              onClick={() => handleOpenChange(false)}
            >
              閉じる
            </Button>
          </div>
        </div>
      ) : (
        <form className="flex flex-1 flex-col" onSubmit={submit}>
          <div className="flex-1 space-y-5 p-5">
            {editorStep === "range" && range && durationTicks > 0 ? (
              <>
                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-8 px-2 text-xs"
                    onClick={() => moveRangeTo(secondsToClipTicks(currentTime))}
                  >
                    <Crosshair className="mr-1.5 h-3.5 w-3.5" />
                    現在の再生位置へ
                  </Button>
                </div>
                <ClipTimeline
                  streamName={live.stream_name}
                  posterUrl={live.static_thumbnail_url || live.thumbnail_url}
                  range={range}
                  durationTicks={durationTicks}
                  currentTime={currentTime}
                  zoomSeconds={zoomSeconds}
                  windowFocus={windowFocus}
                  onZoomChange={(seconds) => {
                    setZoomSeconds(seconds);
                    setWindowFocus(Math.round((range.start + range.end) / 2));
                  }}
                  onWindowFocusChange={(ticks) => moveRangeTo(ticks, false)}
                  onWindowFocusCommit={(ticks) => moveRangeTo(ticks, true)}
                  onRangeChange={(next) => applyRange(next)}
                  onRangeCommit={(ticks) => seekTo(clipTicksToSeconds(ticks))}
                />
                <div className="flex flex-wrap justify-end gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-8 px-2 text-xs"
                    aria-expanded={timeDetailsOpen}
                    aria-controls="clip-time-details"
                    onClick={() => setTimeDetailsOpen((value) => !value)}
                  >
                    詳細
                    <ChevronDown
                      className={`ml-1 h-3.5 w-3.5 transition-transform ${timeDetailsOpen ? "rotate-180" : ""}`}
                    />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-8 px-2 text-xs"
                    onClick={() => void togglePreview()}
                  >
                    {previewing ? (
                      <Pause className="mr-1.5 h-3.5 w-3.5" />
                    ) : (
                      <Play className="mr-1.5 h-3.5 w-3.5" />
                    )}
                    {previewing ? "停止" : "範囲をプレビュー"}
                  </Button>
                </div>
                {timeDetailsOpen && (
                  <div
                    id="clip-time-details"
                    className="grid grid-cols-2 gap-3 rounded-lg bg-muted/40 p-3"
                  >
                    <div>
                      <Label htmlFor="clip-start">開始</Label>
                      <Input
                        id="clip-start"
                        className="mt-2 font-mono"
                        inputMode="decimal"
                        value={startText}
                        onChange={(event) => setStartText(event.target.value)}
                        onBlur={() => commitTimeInput("start")}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            commitTimeInput("start");
                          }
                        }}
                      />
                    </div>
                    <div>
                      <Label htmlFor="clip-end">終了</Label>
                      <Input
                        id="clip-end"
                        className="mt-2 font-mono"
                        inputMode="decimal"
                        value={endText}
                        onChange={(event) => setEndText(event.target.value)}
                        onBlur={() => commitTimeInput("end")}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            commitTimeInput("end");
                          }
                        }}
                      />
                    </div>
                  </div>
                )}
              </>
            ) : editorStep === "range" ? (
              <div className="flex min-h-40 flex-col items-center justify-center rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                <Loader2 className="mb-3 h-5 w-5 animate-spin" />
                動画の長さを取得しています
              </div>
            ) : (
              <>
                <div>
                  <p className="mb-2 text-sm font-semibold">投稿チャンネル</p>
                  <div className="flex items-center gap-3 rounded-xl bg-muted/50 p-3">
                    {activeChannel.profilePhotoUrl ? (
                      <img
                        src={activeChannel.profilePhotoUrl}
                        alt=""
                        className="h-10 w-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-muted" />
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{activeChannel.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        @{activeChannel.handle}
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between gap-3">
                    <Label htmlFor="clip-title">タイトル</Label>
                    <span className="text-xs text-muted-foreground">
                      {title.length}/{MAX_CLIP_TITLE_LENGTH}
                    </span>
                  </div>
                  <Input
                    id="clip-title"
                    className="mt-2 h-11"
                    value={title}
                    maxLength={MAX_CLIP_TITLE_LENGTH}
                    onChange={(event) => {
                      setTitle(event.target.value);
                      setError("");
                    }}
                    placeholder="クリップのタイトルを入力"
                    autoFocus
                  />
                </div>

                {range && (
                  <div className="rounded-xl border p-4">
                    <p className="text-xs font-semibold text-muted-foreground">選択した範囲</p>
                    <div className="mt-2 flex items-center justify-between gap-3 font-mono text-sm">
                      <span>{formatClipTime(range.start)}</span>
                      <span className="text-muted-foreground">→</span>
                      <span>{formatClipTime(range.end)}</span>
                      <span className="ml-auto font-sans font-semibold">
                        {((range.end - range.start) / 10).toFixed(1)}秒
                      </span>
                    </div>
                  </div>
                )}
              </>
            )}

            {error && (
              <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </p>
            )}
          </div>
          <div className="sticky bottom-0 border-t bg-background p-5">
            {editorStep === "range" ? (
              <Button
                type="button"
                className="w-full"
                size="lg"
                disabled={!range || durationTicks <= 0}
                onClick={() => {
                  pause();
                  setPreviewing(false);
                  setEditorStep("details");
                }}
              >
                続ける
              </Button>
            ) : (
              <>
                <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    onClick={() => setEditorStep("range")}
                  >
                    戻る
                  </Button>
                  <Button
                    size="lg"
                    disabled={!range || durationTicks <= 0 || !title.trim() || submitting}
                  >
                    {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {submitting ? "作成中…" : "クリップを作成"}
                  </Button>
                </div>
              </>
            )}
          </div>
        </form>
      )}
    </div>
  );

  return (
    <>
      <Popover
        open={open && mode === "anchored"}
        onOpenChange={(nextOpen) => {
          if (nextOpen && !open) openClip();
        }}
      >
        <PopoverAnchor asChild>
          <Button
            ref={triggerRef}
            type="button"
            variant="secondary"
            className="rounded-full font-bold"
            disabled={checkingChannels}
            onClick={openClip}
          >
            {checkingChannels ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Scissors className="mr-2 h-4 w-4" aria-hidden="true" />
            )}
            クリップ
          </Button>
        </PopoverAnchor>

        {open && mode === "anchored" ? (
          <PopoverContent
            side="top"
            align="end"
            sideOffset={8}
            avoidCollisions={false}
            className="clip-editor-card w-[min(480px,calc(100vw-2rem))] overflow-y-auto p-0 shadow-xl"
            style={{ maxHeight: anchoredMaxHeight }}
            onEscapeKeyDown={(event) => event.preventDefault()}
            onInteractOutside={(event) => event.preventDefault()}
            onPointerDownOutside={(event) => event.preventDefault()}
            onFocusOutside={(event) => event.preventDefault()}
            aria-labelledby="clip-editor-heading"
          >
            {panel}
          </PopoverContent>
        ) : null}

        {open && mode === "sidebar" && sidebarTarget
          ? createPortal(
              <section
                className="clip-editor-card sticky top-4 max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-xl border shadow-sm"
                aria-labelledby="clip-editor-heading"
              >
                {panel}
              </section>,
              sidebarTarget
            )
          : null}

        {open && mode === "mobile" && mobileTarget
          ? createPortal(
              <section
                id="clip-mobile-editor"
                className="clip-editor-card"
                aria-labelledby="clip-editor-heading"
              >
                {panel}
              </section>,
              mobileTarget
            )
          : null}
      </Popover>

      <ChannelSelectDialog
        open={channelSelectOpen}
        channels={ownedChannels}
        loading={checkingChannels}
        error={channelSelectionError}
        selectingChannelId={selectingChannelId}
        onOpenChange={setChannelSelectOpen}
        onSelect={(channel) => void selectClipChannel(channel)}
        onRetry={() => void loadOwnedChannelsForClip()}
      />

      {session?.user?.access_token && (
        <ChannelCreateDialog
          token={session.user.access_token}
          defaultIconUrl={session.user.image ?? null}
          open={channelCreateOpen}
          onOpenChange={setChannelCreateOpen}
          onCreated={finishCreatingClipChannel}
        />
      )}
    </>
  );
}
