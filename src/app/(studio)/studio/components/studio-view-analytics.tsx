"use client";

import { currentTokyoDate, currentTokyoMonth, shiftMonth } from "@/lib/view-analytics";
import {
  getStudioChannelViewAnalytics,
  getStudioClipViewAnalytics,
  getStudioStreamViewAnalytics,
} from "@/requests/studio";
import type { ViewAnalytics } from "@/types/view-analytics";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import React, { useCallback, useEffect, useState } from "react";

function withMonth(basePath: string, month: string): string {
  const [path, query = ""] = basePath.split("?");
  const params = new URLSearchParams(query);
  params.set("month", month);
  return `${path}?${params}`;
}

function safeCount(value: unknown): number {
  const count = Number(value);
  return Number.isFinite(count) ? Math.max(0, count) : 0;
}

function hasCount(value: unknown): boolean {
  return value !== null && value !== undefined && Number.isFinite(Number(value));
}

export default function StudioViewAnalytics({
  analytics,
  basePath,
  token,
  title = "再生数",
}: {
  analytics: ViewAnalytics | null;
  basePath: string;
  token: string;
  title?: string;
}) {
  const [current, setCurrent] = useState(analytics);
  const [loadingMonth, setLoadingMonth] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => setCurrent(analytics), [analytics]);

  const loadMonth = useCallback(
    async (month: string, updateUrl: boolean) => {
      if (!current || loadingMonth) return;
      setLoadingMonth(month);
      setError("");
      try {
        const nextAnalytics =
          current.scope.type === "channel"
            ? await getStudioChannelViewAnalytics(Number(current.scope.id), token, month)
            : current.scope.type === "clip"
              ? await getStudioClipViewAnalytics(String(current.scope.id), token, month)
              : await getStudioStreamViewAnalytics(Number(current.scope.id), token, month);
        setCurrent(nextAnalytics);
        if (updateUrl) window.history.pushState({}, "", withMonth(basePath, month));
      } catch {
        setError("再生数の分析を取得できませんでした。");
      } finally {
        setLoadingMonth(null);
      }
    },
    [basePath, current, loadingMonth, token]
  );

  useEffect(() => {
    const onPopState = () => {
      const month = new URL(window.location.href).searchParams.get("month");
      if (month && month !== current?.month) void loadMonth(month, false);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [current?.month, loadMonth]);

  if (!current) {
    return (
      <section className="studio-card p-5">
        <h2 className="font-bold">{title}</h2>
        <p className="mt-3 text-sm text-[var(--studio-muted)]">
          再生数の分析を取得できませんでした。
        </p>
      </section>
    );
  }
  const previous = shiftMonth(current.month, -1);
  const next = shiftMonth(current.month, 1);
  const canNext = next <= currentTokyoMonth();
  const daily = (Array.isArray(current.daily) ? current.daily : []).filter(
    (day) => current.month !== currentTokyoMonth() || day.date <= currentTokyoDate()
  );
  const max = Math.max(1, ...daily.map((day) => safeCount(day.total_views)));
  const points = (field: "total_views" | "stream_views" | "clip_views") =>
    daily
      .map((day, index) => {
        const x = daily.length <= 1 ? 0 : (index / (daily.length - 1)) * 100;
        const y = 100 - (safeCount(day[field]) / max) * 100;
        return `${x},${y}`;
      })
      .join(" ");
  const summary = current.summary ?? ({} as ViewAnalytics["summary"]);
  const dailyViews = daily.reduce((total, day) => total + safeCount(day.total_views), 0);
  const monthlyViews = Math.max(safeCount(summary.total_views), dailyViews);
  const cards = [
    ["この月の再生数", monthlyViews],
    ["累計再生数", safeCount(summary.lifetime_views)],
    ...(hasCount(summary.stream_views)
      ? [["動画・アーカイブ", safeCount(summary.stream_views)]]
      : []),
    ...(hasCount(summary.clip_views) ? [["クリップ", safeCount(summary.clip_views)]] : []),
    ...(hasCount(summary.lifetime_stream_views)
      ? [["累計 動画・アーカイブ", safeCount(summary.lifetime_stream_views)]]
      : []),
    ...(hasCount(summary.lifetime_clip_views)
      ? [["累計 クリップ", safeCount(summary.lifetime_clip_views)]]
      : []),
  ] as Array<[string, number]>;

  return (
    <section className="studio-card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--studio-border)] p-5">
        <div>
          <h2 className="font-bold">{title}</h2>
          <p className="mt-1 text-xs text-[var(--studio-muted)]">{current.timezone}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void loadMonth(previous, true)}
            disabled={loadingMonth !== null}
            className="rounded-lg border p-2 disabled:opacity-50"
            aria-label="前の月"
          >
            {loadingMonth === previous ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>
          <span className="min-w-24 text-center text-sm font-semibold">{current.month}</span>
          {canNext ? (
            <button
              type="button"
              onClick={() => void loadMonth(next, true)}
              disabled={loadingMonth !== null}
              className="rounded-lg border p-2 disabled:opacity-50"
              aria-label="次の月"
            >
              {loadingMonth === next ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
          ) : (
            <span className="rounded-lg border p-2 opacity-35" aria-label="次の月は選択できません">
              <ChevronRight className="h-4 w-4" />
            </span>
          )}
        </div>
      </div>
      {error && <p className="px-5 pt-4 text-sm text-red-600">{error}</p>}
      <div className="grid gap-3 p-5 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(([label, value]) => (
          <div key={label} className="rounded-xl bg-[var(--studio-subtle)] p-4">
            <p className="text-xs text-[var(--studio-muted)]">{label}</p>
            <p className="mt-1 text-2xl font-bold tabular-nums">{value.toLocaleString("ja-JP")}</p>
          </div>
        ))}
      </div>
      <div className="px-5 pb-5">
        <div className="h-56 rounded-xl border border-[var(--studio-border)] p-4">
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="h-full w-full"
            role="img"
            aria-label={`${current.month}の日別再生数`}
          >
            {[0, 25, 50, 75, 100].map((y) => (
              <line
                key={y}
                x1="0"
                x2="100"
                y1={y}
                y2={y}
                stroke="currentColor"
                opacity="0.08"
                vectorEffect="non-scaling-stroke"
              />
            ))}
            {points("total_views") && (
              <polyline
                points={points("total_views")}
                fill="none"
                stroke="var(--studio-accent)"
                strokeWidth="2"
                vectorEffect="non-scaling-stroke"
              />
            )}
            {hasCount(summary.stream_views) && (
              <polyline
                points={points("stream_views")}
                fill="none"
                stroke="#16a34a"
                strokeWidth="1.5"
                vectorEffect="non-scaling-stroke"
              />
            )}
            {hasCount(summary.clip_views) && (
              <polyline
                points={points("clip_views")}
                fill="none"
                stroke="#f97316"
                strokeWidth="1.5"
                vectorEffect="non-scaling-stroke"
              />
            )}
          </svg>
        </div>
        {hasCount(summary.stream_views) && (
          <div className="mt-3 flex flex-wrap gap-4 text-xs text-[var(--studio-muted)]">
            <span>
              <i className="mr-1 inline-block h-2 w-2 rounded-full bg-[var(--studio-accent)]" />
              合計
            </span>
            <span>
              <i className="mr-1 inline-block h-2 w-2 rounded-full bg-green-600" />
              動画・アーカイブ
            </span>
            <span>
              <i className="mr-1 inline-block h-2 w-2 rounded-full bg-orange-500" />
              クリップ
            </span>
          </div>
        )}
        <div className="mt-3 flex justify-between text-xs text-[var(--studio-muted)]">
          <span>{daily[0]?.date ?? current.month}</span>
          <span>{daily.at(-1)?.date ?? current.month}</span>
        </div>
      </div>
    </section>
  );
}
