import React from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GiftHistory } from "./gift-history";
import { getSentGifts } from "@/requests/gifts";

vi.mock("@/requests/gifts", () => ({
  GiftApiError: class GiftApiError extends Error {
    status = 500;
  },
  getSentGifts: vi.fn(),
  returnGift: vi.fn(),
}));

vi.mock("next-auth/react", () => ({ signIn: vi.fn() }));

describe("GiftHistory", () => {
  beforeEach(() => {
    vi.mocked(getSentGifts).mockResolvedValue({
      currentPage: 1,
      lastPage: 1,
      total: 1,
      data: [
        {
          id: 1,
          expected_amount: 150,
          comment: null,
          display_style: "blue",
          status: "completed",
          expires_at: null,
          completed_at: "2026-07-30T01:26:06+09:00",
          attempts: [
            {
              id: 1,
              amount: 150,
              status: "completed",
              accessed_at: null,
              received_at: "2026-07-30T01:26:06+09:00",
              returnable: false,
            },
          ],
        },
      ],
    });
  });

  it("does not show a failure or return action for a completed attempt", async () => {
    render(<GiftHistory token="token" />);

    expect((await screen.findAllByText("送信完了")).length).toBeGreaterThanOrEqual(2);
    expect(screen.queryByText("送信失敗")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "ギフトを返却" })).not.toBeInTheDocument();
  });

  it("shows the email and amount-specific Amazon link for a pending session", async () => {
    vi.mocked(getSentGifts).mockResolvedValueOnce({
      currentPage: 1,
      lastPage: 1,
      total: 1,
      data: [
        {
          id: 2,
          gift_id: "01KYQB2N8BVW4S3QV40D98G51Z",
          expected_amount: 150,
          comment: null,
          display_style: "blue",
          status: "pending",
          expires_at: null,
          completed_at: null,
          attempts: [],
        },
      ],
    });

    render(<GiftHistory token="token" />);

    expect(
      await screen.findByDisplayValue("01kyqb2n8bvw4s3qv40d98g51z@gift.tokuly.com")
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Amazonを開く/ })).toHaveAttribute(
      "href",
      "https://www.amazon.co.jp/dp/B06X982RQ9?th=1&gpo=150"
    );
  });
});
