import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { currentTokyoDate, currentTokyoMonth, shiftMonth } from "@/lib/view-analytics";
import { getStudioStreamViewAnalytics } from "@/requests/studio";
import StudioViewAnalytics from "./studio-view-analytics";

vi.mock("@/requests/studio", () => ({
  getStudioChannelViewAnalytics: vi.fn(),
  getStudioClipViewAnalytics: vi.fn(),
  getStudioStreamViewAnalytics: vi.fn(),
}));

describe("StudioViewAnalytics", () => {
  afterEach(cleanup);

  it("shows monthly and lifetime channel breakdowns and all daily values", () => {
    const month = currentTokyoMonth();
    render(
      <StudioViewAnalytics
        basePath="/studio"
        token="token"
        analytics={{
          scope: { type: "channel", id: 10 },
          timezone: "Asia/Tokyo",
          month,
          summary: {
            total_views: 1250,
            stream_views: 1000,
            clip_views: 250,
            lifetime_views: 5200,
            lifetime_stream_views: 4400,
            lifetime_clip_views: 800,
          },
          daily: [
            { date: `${month}-01`, total_views: 0, stream_views: 0, clip_views: 0 },
            { date: `${month}-02`, total_views: 45, stream_views: 40, clip_views: 5 },
          ],
        }}
      />
    );
    expect(screen.getByText("1,250")).toBeInTheDocument();
    expect(screen.getByText("累計 動画・アーカイブ")).toBeInTheDocument();
    expect(screen.getByText("800")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: `${month}の日別再生数` })).toBeInTheDocument();
    expect(screen.getByLabelText("次の月は選択できません")).toBeInTheDocument();
  });

  it("keeps the Studio page usable when analytics cannot be loaded", () => {
    render(<StudioViewAnalytics basePath="/studio" analytics={null} token="token" />);
    expect(screen.getByText("再生数の分析を取得できませんでした。")).toBeInTheDocument();
  });

  it("derives the monthly total from daily values when the summary count is stale", () => {
    const month = currentTokyoMonth();
    render(
      <StudioViewAnalytics
        basePath="/studio/videos/1"
        token="token"
        analytics={{
          scope: { type: "stream", id: 1 },
          timezone: "Asia/Tokyo",
          month,
          summary: { total_views: 0, lifetime_views: 9 },
          daily: [
            { date: `${month}-01`, total_views: 2 },
            { date: `${month}-02`, total_views: 3 },
          ],
        }}
      />
    );
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("9")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: `${month}の日別再生数` })).toBeInTheDocument();
  });

  it("loads another month in place without navigating the page", async () => {
    const month = currentTokyoMonth();
    const previous = shiftMonth(month, -1);
    vi.mocked(getStudioStreamViewAnalytics).mockResolvedValue({
      scope: { type: "stream", id: 1 },
      timezone: "Asia/Tokyo",
      month: previous,
      summary: { total_views: 7, lifetime_views: 12 },
      daily: [{ date: `${previous}-01`, total_views: 7 }],
    });
    render(
      <StudioViewAnalytics
        basePath="/studio/videos/1"
        token="token"
        analytics={{
          scope: { type: "stream", id: 1 },
          timezone: "Asia/Tokyo",
          month,
          summary: { total_views: 1, lifetime_views: 5 },
          daily: [{ date: `${month}-01`, total_views: 1 }],
        }}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "前の月" }));

    await waitFor(() => expect(screen.getByText(previous)).toBeInTheDocument());
    expect(getStudioStreamViewAnalytics).toHaveBeenCalledWith(1, "token", previous);
    expect(window.location.pathname).toBe("/studio/videos/1");
    expect(window.location.search).toBe(`?month=${previous}`);
  });

  it("does not include future dates in the current month graph", () => {
    const month = currentTokyoMonth();
    const today = currentTokyoDate();
    render(
      <StudioViewAnalytics
        basePath="/studio/videos/1"
        token="token"
        analytics={{
          scope: { type: "stream", id: 1 },
          timezone: "Asia/Tokyo",
          month,
          summary: { total_views: 3, lifetime_views: 3 },
          daily: [
            { date: `${month}-01`, total_views: 1 },
            { date: today, total_views: 2 },
            { date: `${month}-31`, total_views: 0 },
          ],
        }}
      />
    );

    expect(screen.getByText(today)).toBeInTheDocument();
    expect(screen.queryByText(`${month}-31`)).not.toBeInTheDocument();
  });
});
