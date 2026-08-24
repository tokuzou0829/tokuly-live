import { describe, expect, it } from "vitest";
import { currentTokyoDate, resolveAnalyticsMonth, shiftMonth } from "./view-analytics";

describe("view analytics month", () => {
  it("returns today's date in Asia/Tokyo", () => {
    expect(currentTokyoDate(new Date("2026-08-24T15:30:00Z"))).toBe("2026-08-25");
  });
  const now = new Date("2026-08-24T03:00:00Z");

  it("accepts past months and rejects future or malformed months", () => {
    expect(resolveAnalyticsMonth("2026-07", now)).toBe("2026-07");
    expect(resolveAnalyticsMonth("2026-09", now)).toBe("2026-08");
    expect(resolveAnalyticsMonth("2026-8", now)).toBe("2026-08");
  });

  it("moves across year boundaries", () => {
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
  });
});
