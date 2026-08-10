"use client";

import { getListenerAnalytics } from "@/requests/studio";
import type { ListenerAnalytics } from "@/types/studio";
import io from "socket.io-client";
import type { PointerEvent as ReactPointerEvent } from "react";
import { useEffect, useMemo, useState } from "react";

const duration = (seconds: number) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return hours ? `${hours}時間 ${minutes}分` : `${minutes}分`;
};

const concurrentColor = "#3b82f6";
const uniqueColor = "#f97316";
const ranges = [30, 60, 180, 360, 720, 1440] as const;

const rangeLabel = (minutes: number) => (minutes < 60 ? `${minutes}分` : `${minutes / 60}時間`);

export default function StudioAnalytics({
  streamId,
  token,
  initial,
}: {
  streamId: number;
  token: string;
  initial: ListenerAnalytics;
}) {
  const [analytics, setAnalytics] = useState(initial);
  const [current, setCurrent] = useState(initial.summary?.current_count ?? 0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [rangeMinutes, setRangeMinutes] = useState<number>(initial.summary?.finalized ? 1440 : 30);

  useEffect(() => {
    const timer = window.setInterval(() => {
      getListenerAnalytics(streamId, token)
        .then(setAnalytics)
        .catch(() => undefined);
    }, 30_000);
    const socket = io("https://live-data.tokuly.com", {
      path: "/chat/socket.io/",
      transports: ["websocket", "polling"],
    });
    socket.on("connect", () => {
      socket.emit("join", { token: "guest", name: "studio", roomId: streamId });
    });
    socket.on(
      "listener:count",
      (payload: { stream_id?: number; current_count?: number; count?: number }) => {
        const nextCount = payload.current_count ?? payload.count;
        if (Number(payload.stream_id) === streamId && Number.isFinite(nextCount)) {
          setCurrent(Math.max(0, Number(nextCount)));
        }
      }
    );
    return () => {
      window.clearInterval(timer);
      socket.disconnect();
    };
  }, [streamId, token]);

  const isArchive = Boolean(analytics.summary?.finalized || analytics.summary?.ended_at);
  useEffect(() => {
    if (isArchive) setRangeMinutes(1440);
  }, [isArchive]);

  const visibleTimeline = useMemo(() => {
    if (!analytics.timeline.length) return [];
    const endedAt = analytics.summary?.ended_at
      ? new Date(analytics.summary.ended_at).getTime()
      : Number.NaN;
    const lastPointAt = new Date(analytics.timeline.at(-1)?.timestamp ?? "").getTime();
    const anchor = isArchive && Number.isFinite(endedAt) ? endedAt : lastPointAt;
    if (!Number.isFinite(anchor)) return analytics.timeline;
    const cutoff = anchor - rangeMinutes * 60_000;
    return analytics.timeline.filter((point) => {
      const timestamp = new Date(point.timestamp).getTime();
      return !Number.isFinite(timestamp) || (timestamp >= cutoff && timestamp <= anchor);
    });
  }, [analytics.summary?.ended_at, analytics.timeline, isArchive, rangeMinutes]);

  const chart = useMemo(() => {
    const max = Math.max(
      ...visibleTimeline.flatMap((point) => [
        point.concurrent_listeners,
        point.cumulative_unique_listeners,
      ]),
      1
    );
    const points = visibleTimeline.map((point, index) => ({
      ...point,
      x: (index / Math.max(visibleTimeline.length - 1, 1)) * 100,
      concurrentY: 94 - (point.concurrent_listeners / max) * 84,
      uniqueY: 94 - (point.cumulative_unique_listeners / max) * 84,
    }));
    return {
      max,
      points,
      concurrentLine: points.map((point) => `${point.x},${point.concurrentY}`).join(" "),
      uniqueLine: points.map((point) => `${point.x},${point.uniqueY}`).join(" "),
      area: points.length
        ? `0,94 ${points.map((point) => `${point.x},${point.concurrentY}`).join(" ")} 100,94`
        : "",
    };
  }, [visibleTimeline]);
  const summary = analytics.summary;
  const selected = selectedIndex === null ? null : chart.points[selectedIndex];

  function selectPoint(event: ReactPointerEvent<SVGSVGElement>) {
    if (!chart.points.length) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (event.clientX - bounds.left) / bounds.width));
    setSelectedIndex(Math.round(ratio * (chart.points.length - 1)));
  }

  const pointTime = (timestamp: string, elapsedSeconds: number) => {
    const date = new Date(timestamp);
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleTimeString("ja-JP", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    }
    return `開始から ${duration(elapsedSeconds)}`;
  };

  const changeZoom = (direction: -1 | 1) => {
    const currentIndex = ranges.findIndex((range) => range === rangeMinutes);
    const nextIndex = Math.min(ranges.length - 1, Math.max(0, currentIndex + direction));
    setRangeMinutes(ranges[nextIndex]);
    setSelectedIndex(null);
  };

  return (
    <section className="studio-card p-5">
      <div className="mb-4">
        <h2 className="font-bold">リアルタイム分析</h2>
      </div>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[
          ["現在の視聴者", current.toLocaleString()],
          ["最大同時視聴", (summary?.peak_concurrent ?? 0).toLocaleString()],
          ["ユニーク視聴者", (summary?.unique_listeners ?? 0).toLocaleString()],
          ["総視聴時間", duration(summary?.total_listening_seconds ?? 0)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl bg-[var(--studio-subtle)] p-3">
            <p className="studio-label">{label}</p>
            <p className="mt-1 text-xl font-bold">{value}</p>
          </div>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs font-medium">
        <span className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: concurrentColor }} />
          同時視聴者
        </span>
        <span className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: uniqueColor }} />
          累計ユニーク視聴者
        </span>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex max-w-full gap-1 overflow-x-auto pb-1">
          {ranges.map((range) => (
            <button
              key={range}
              type="button"
              onClick={() => {
                setRangeMinutes(range);
                setSelectedIndex(null);
              }}
              className={`shrink-0 rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors ${rangeMinutes === range ? "bg-[var(--studio-fg)] text-[var(--studio-bg)]" : "bg-[var(--studio-subtle)] hover:bg-[var(--studio-active)]"}`}
            >
              {rangeLabel(range)}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => changeZoom(-1)}
            disabled={rangeMinutes === ranges[0]}
            className="rounded-md border border-[var(--studio-border)] px-2.5 py-1.5 text-xs font-semibold disabled:opacity-40"
          >
            拡大
          </button>
          <button
            type="button"
            onClick={() => changeZoom(1)}
            disabled={rangeMinutes === ranges.at(-1)}
            className="rounded-md border border-[var(--studio-border)] px-2.5 py-1.5 text-xs font-semibold disabled:opacity-40"
          >
            縮小
          </button>
        </div>
      </div>
      <div className="mt-2 rounded-lg bg-[var(--studio-subtle)] p-3">
        {chart.concurrentLine ? (
          <>
            <div className="mb-2 text-[10px] font-medium text-[var(--studio-muted)]">
              最大 {chart.max.toLocaleString()}人
            </div>
            <div className="relative h-36 sm:h-44">
              {selected && (
                <div
                  className="pointer-events-none absolute top-1 z-20 min-w-32 -translate-x-1/2 rounded-md border border-[var(--studio-border)] bg-[var(--studio-surface)] px-3 py-2 text-center shadow-lg"
                  style={{ left: `${Math.min(88, Math.max(12, selected.x))}%` }}
                >
                  <p className="flex items-center justify-center gap-2 text-sm font-bold">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: concurrentColor }}
                    />
                    同時 {selected.concurrent_listeners.toLocaleString()}人
                  </p>
                  <p className="mt-1 flex items-center justify-center gap-2 text-sm font-bold">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: uniqueColor }}
                    />
                    累計 {selected.cumulative_unique_listeners.toLocaleString()}人
                  </p>
                  <p className="mt-0.5 text-[11px] text-[var(--studio-muted)]">
                    {pointTime(selected.timestamp, selected.elapsed_seconds)}
                  </p>
                </div>
              )}
              <svg
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                className="h-full w-full touch-none cursor-crosshair"
                role="img"
                aria-label="同時視聴者数と累計ユニーク視聴者数の推移。グラフをタップすると各時点の人数を確認できます"
                onPointerDown={(event) => {
                  event.currentTarget.setPointerCapture(event.pointerId);
                  selectPoint(event);
                }}
                onPointerMove={(event) => {
                  if (
                    event.pointerType === "mouse" ||
                    event.currentTarget.hasPointerCapture(event.pointerId)
                  )
                    selectPoint(event);
                }}
                onPointerUp={(event) => {
                  if (event.currentTarget.hasPointerCapture(event.pointerId))
                    event.currentTarget.releasePointerCapture(event.pointerId);
                }}
                onPointerLeave={(event) => {
                  if (event.pointerType === "mouse") setSelectedIndex(null);
                }}
              >
                {[10, 31, 52, 73, 94].map((y) => (
                  <line
                    key={y}
                    x1="0"
                    x2="100"
                    y1={y}
                    y2={y}
                    stroke="var(--studio-border)"
                    strokeWidth="1"
                    vectorEffect="non-scaling-stroke"
                  />
                ))}
                <polygon points={chart.area} fill={concurrentColor} opacity="0.1" />
                <polyline
                  points={chart.concurrentLine}
                  fill="none"
                  stroke={concurrentColor}
                  strokeWidth="2.5"
                  vectorEffect="non-scaling-stroke"
                />
                <polyline
                  points={chart.uniqueLine}
                  fill="none"
                  stroke={uniqueColor}
                  strokeWidth="2.5"
                  vectorEffect="non-scaling-stroke"
                />
                {selected && (
                  <line
                    x1={selected.x}
                    x2={selected.x}
                    y1="10"
                    y2="94"
                    stroke="var(--studio-fg)"
                    strokeWidth="1"
                    strokeDasharray="4 4"
                    vectorEffect="non-scaling-stroke"
                  />
                )}
              </svg>
              {selected && (
                <>
                  <span
                    className="pointer-events-none absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow"
                    style={{
                      left: `${selected.x}%`,
                      top: `${selected.concurrentY}%`,
                      backgroundColor: concurrentColor,
                    }}
                  />
                  <span
                    className="pointer-events-none absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow"
                    style={{
                      left: `${selected.x}%`,
                      top: `${selected.uniqueY}%`,
                      backgroundColor: uniqueColor,
                    }}
                  />
                </>
              )}
            </div>
            <div className="pointer-events-none mt-2 flex justify-between border-t border-[var(--studio-border)] pt-2 text-[10px] text-[var(--studio-muted)]">
              <span>
                {chart.points[0]
                  ? pointTime(chart.points[0].timestamp, chart.points[0].elapsed_seconds)
                  : ""}
              </span>
              <span>
                {chart.points.at(-1)
                  ? pointTime(chart.points.at(-1)!.timestamp, chart.points.at(-1)!.elapsed_seconds)
                  : ""}
              </span>
            </div>
          </>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-[var(--studio-muted)]">
            分析データはまだありません
          </div>
        )}
      </div>
    </section>
  );
}
