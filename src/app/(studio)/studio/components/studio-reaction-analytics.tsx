"use client";

import type { ReactionAnalytics } from "@/types/reaction";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import React, { type PointerEvent as ReactPointerEvent, useState } from "react";

const percent = (value: number | null) => (value === null ? "—" : `${value.toFixed(2)}%`);
const dateLabel = (value: string) => {
  const [year, month, day] = value.split("-");
  return `${year}/${month}/${day}`;
};
const signed = (value: number) =>
  value > 0 ? `+${value.toLocaleString()}` : value.toLocaleString();

export default function StudioReactionAnalytics({
  analytics,
}: {
  analytics: ReactionAnalytics | null;
}) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  if (!analytics) {
    return (
      <section className="studio-card min-w-0 max-w-full p-4 sm:p-5">
        <h2 className="font-bold">評価分析</h2>
        <p className="mt-1 text-sm text-[var(--studio-muted)]">直近7日間</p>
        <p role="alert" className="mt-4 rounded-lg bg-[var(--studio-subtle)] p-4 text-sm">
          評価分析を読み込めませんでした。ページを再読み込みしてください。
        </p>
      </section>
    );
  }

  const summary = [
    { label: "高評価", value: analytics.total_likes.toLocaleString() },
    { label: "低評価", value: analytics.total_dislikes.toLocaleString() },
    { label: "総評価", value: analytics.total_reactions.toLocaleString() },
    { label: "高評価率", value: percent(analytics.like_rate_percent) },
    { label: "低評価率", value: percent(analytics.dislike_rate_percent) },
    {
      label: "評価のスコア",
      value: signed(analytics.net_score),
      valueClass:
        analytics.net_score > 0
          ? "text-emerald-600"
          : analytics.net_score < 0
            ? "text-red-600"
            : undefined,
    },
  ];
  const maxDailyCount = Math.max(
    1,
    ...analytics.daily.flatMap((day) => [day.like_count, day.dislike_count])
  );
  const chartPoints = analytics.daily.map((day, index) => {
    const x = analytics.daily.length <= 1 ? 50 : (index / (analytics.daily.length - 1)) * 100;
    return {
      ...day,
      x,
      likeY: 94 - (day.like_count / maxDailyCount) * 84,
      dislikeY: 94 - (day.dislike_count / maxDailyCount) * 84,
    };
  });
  const likeLine = chartPoints.map((point) => `${point.x},${point.likeY}`).join(" ");
  const dislikeLine = chartPoints.map((point) => `${point.x},${point.dislikeY}`).join(" ");
  const selected = selectedIndex === null ? null : chartPoints[selectedIndex];

  function selectPoint(event: ReactPointerEvent<SVGSVGElement>) {
    if (!chartPoints.length) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (event.clientX - bounds.left) / bounds.width));
    setSelectedIndex(Math.round(ratio * (chartPoints.length - 1)));
  }

  return (
    <section className="studio-card min-w-0 max-w-full overflow-hidden">
      <div className="p-5">
        <h2 className="font-bold">評価分析</h2>
        <p className="mt-1 text-sm text-[var(--studio-muted)]">
          直近7日間（{dateLabel(analytics.from_date)}〜{dateLabel(analytics.to_date)}、
          {analytics.timezone}）
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
          {summary.map((item) => (
            <div key={item.label} className="rounded-xl bg-[var(--studio-subtle)] p-3">
              <p className="studio-label">{item.label}</p>
              <p className={`mt-1 text-xl font-bold ${item.valueClass ?? ""}`}>{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-[var(--studio-border)] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-bold">日別評価数</h3>
          <div className="flex items-center gap-4 text-xs font-medium">
            <span className="inline-flex items-center gap-1.5">
              <ThumbsUp className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="h-0.5 w-5 bg-slate-950" aria-hidden="true" />
              高評価
            </span>
            <span className="inline-flex items-center gap-1.5">
              <ThumbsDown className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="h-0.5 w-5 bg-slate-400" aria-hidden="true" />
              低評価
            </span>
          </div>
        </div>
        <div className="mt-3 rounded-lg bg-[var(--studio-subtle)] p-3">
          <div className="mb-2 text-[10px] font-medium text-[var(--studio-muted)]">
            最大 {maxDailyCount.toLocaleString()}件
          </div>
          <div className="relative h-40 sm:h-48">
            {selected && (
              <div
                className="pointer-events-none absolute top-1 z-20 min-w-36 -translate-x-1/2 rounded-md border border-[var(--studio-border)] bg-[var(--studio-surface)] px-3 py-2 text-center shadow-lg"
                style={{ left: `${Math.min(88, Math.max(12, selected.x))}%` }}
              >
                <p className="text-sm font-bold">高評価 {selected.like_count.toLocaleString()}件</p>
                <p className="mt-1 text-sm font-bold text-slate-500">
                  低評価 {selected.dislike_count.toLocaleString()}件
                </p>
                <p className="mt-0.5 text-[11px] text-[var(--studio-muted)]">
                  {dateLabel(selected.date)}
                </p>
              </div>
            )}
            <svg
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              className="h-full w-full touch-none cursor-crosshair"
              role="img"
              aria-label="直近7日間の高評価数と低評価数の折れ線グラフ。グラフをタップすると各日の件数を確認できます"
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
              <polyline
                points={likeLine}
                fill="none"
                stroke="#020617"
                strokeWidth="2.5"
                vectorEffect="non-scaling-stroke"
              />
              <polyline
                points={dislikeLine}
                fill="none"
                stroke="#94a3b8"
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
                  className="pointer-events-none absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-slate-950 shadow"
                  style={{ left: `${selected.x}%`, top: `${selected.likeY}%` }}
                />
                <span
                  className="pointer-events-none absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-slate-400 shadow"
                  style={{ left: `${selected.x}%`, top: `${selected.dislikeY}%` }}
                />
              </>
            )}
          </div>
          <div className="mt-2 grid grid-cols-7 text-center text-[10px] font-medium text-[var(--studio-muted)]">
            {analytics.daily.map((day) => (
              <span key={day.date}>{dateLabel(day.date).slice(5)}</span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
