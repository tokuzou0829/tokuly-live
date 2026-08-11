import { render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it } from "vitest";
import SeekBar, { seekBarPercent } from "./player-seekbar";

describe("SeekBar", () => {
  it("clamps invalid and out-of-range percentages", () => {
    expect(seekBarPercent(10, 0)).toBe(0);
    expect(seekBarPercent(-1, 30)).toBe(0);
    expect(seekBarPercent(15, 30)).toBe(50);
    expect(seekBarPercent(90, 30)).toBe(100);
  });

  it("keeps clip buffer, progress, and the end thumb inside the bar", () => {
    render(<SeekBar playervalue={30} bufferValue={90} duration={30} onChange={() => undefined} />);

    expect(screen.getByTestId("seekbar-buffer")).toHaveStyle({ width: "100%" });
    expect(screen.getByTestId("seekbar-progress")).toHaveStyle({ width: "100%" });
    expect(screen.getByTestId("seekbar-thumb")).toHaveStyle({
      left: "clamp(8px, 100%, calc(100% - 8px))",
    });
  });
});
