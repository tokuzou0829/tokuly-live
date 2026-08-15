import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ReactionAnalytics } from "@/types/reaction";
import StudioReactionAnalytics from "./studio-reaction-analytics";

const analytics: ReactionAnalytics = {
  scope: { type: "stream", id: 34 },
  timezone: "Asia/Tokyo",
  from_date: "2026-08-10",
  to_date: "2026-08-16",
  total_likes: 3,
  total_dislikes: 1,
  total_reactions: 4,
  like_rate_percent: 75,
  dislike_rate_percent: 25,
  net_score: 2,
  daily: [
    {
      date: "2026-08-10",
      like_count: 1,
      dislike_count: 0,
      reaction_count: 1,
      like_rate_percent: 100,
      dislike_rate_percent: 0,
      net_score: 1,
    },
    {
      date: "2026-08-11",
      like_count: 0,
      dislike_count: 1,
      reaction_count: 1,
      like_rate_percent: null,
      dislike_rate_percent: null,
      net_score: -1,
    },
  ],
};

describe("StudioReactionAnalytics", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("shows channel-wide totals and a seven-day rating graph", () => {
    render(<StudioReactionAnalytics analytics={analytics} />);
    expect(screen.getByRole("heading", { name: "評価分析" })).toBeInTheDocument();
    expect(screen.getByText(/直近7日間/)).toBeInTheDocument();
    expect(screen.getByText("高評価率")).toBeInTheDocument();
    expect(screen.getByText("低評価率")).toBeInTheDocument();
    expect(screen.getByText("75.00%")).toBeInTheDocument();
    expect(screen.getByText("+2")).toHaveClass("text-emerald-600");
    expect(screen.getByRole("heading", { name: "評価分析" }).closest("section")).toHaveClass(
      "min-w-0",
      "max-w-full",
      "overflow-hidden"
    );
    expect(
      screen.getByRole("img", {
        name: "直近7日間の高評価数と低評価数の折れ線グラフ。グラフをタップすると各日の件数を確認できます",
      })
    ).toBeInTheDocument();
  });

  it("shows a negative net score in red", () => {
    render(<StudioReactionAnalytics analytics={{ ...analytics, net_score: -2 }} />);
    expect(screen.getByText("-2")).toHaveClass("text-red-600");
  });

  it("shows the nearest day's values when the graph is touched", () => {
    vi.stubGlobal("PointerEvent", MouseEvent);
    render(<StudioReactionAnalytics analytics={analytics} />);
    const graph = screen.getByRole("img", {
      name: /グラフをタップすると各日の件数を確認できます/,
    });
    vi.spyOn(graph, "getBoundingClientRect").mockReturnValue({
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      right: 700,
      bottom: 220,
      width: 700,
      height: 220,
      toJSON: () => ({}),
    });
    Object.assign(graph, {
      setPointerCapture: vi.fn(),
      hasPointerCapture: vi.fn(() => false),
      releasePointerCapture: vi.fn(),
    });

    fireEvent.pointerDown(graph, { clientX: 700, pointerId: 1 });
    expect(screen.getByText("2026/08/11")).toBeInTheDocument();
    expect(screen.getByText("高評価 0件")).toBeInTheDocument();
    expect(screen.getByText("低評価 1件")).toBeInTheDocument();
  });

  it("keeps the management page useful when analytics cannot be loaded", () => {
    render(<StudioReactionAnalytics analytics={null} />);
    expect(screen.getByRole("alert")).toHaveTextContent("ページを再読み込みしてください");
  });
});
