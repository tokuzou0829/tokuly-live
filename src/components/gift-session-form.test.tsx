import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createGiftSession } from "@/requests/gifts";
import {
  GiftSessionForm,
  giftAmountToSliderPosition,
  sliderPositionToGiftAmount,
} from "./gift-session-form";

vi.mock("@/requests/gifts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/requests/gifts")>();
  return { ...actual, createGiftSession: vi.fn() };
});

describe("GiftSessionForm", () => {
  afterEach(() => cleanup());

  it("shows the gift exactly as a chat message preview", () => {
    render(
      <GiftSessionForm
        channelId={5}
        liveStreamId={146}
        token="token"
        senderName="Alice"
        senderImage="https://example.test/alice.jpg"
        compact
      />
    );

    const preview = screen.getByTestId("gift-message-gift-preview");
    expect(screen.getByLabelText("ギフト表示プレビュー")).toContainElement(preview);
    expect(preview).toHaveTextContent("Alice");
    expect(preview).toHaveTextContent("￥1,000");
    expect(screen.queryByText("金額とメッセージを設定してください")).not.toBeInTheDocument();
    expect(screen.queryByText("¥150")).not.toBeInTheDocument();
    expect(screen.queryByText("¥200,000")).not.toBeInTheDocument();
    expect(screen.queryByText("この金額帯ではメッセージを付けられません")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("メッセージ"), {
      target: { value: "応援しています" },
    });
    expect(preview).toHaveTextContent("応援しています");
  });

  it("supports coarse slider control and precise amount controls", () => {
    render(
      <GiftSessionForm channelId={5} liveStreamId={146} token="token" senderName="Alice" compact />
    );

    const amountInput = screen.getByLabelText("ギフト金額");
    expect(screen.getByRole("slider", { name: "ギフト金額を大きく調整" })).toBeInTheDocument();
    expect(screen.queryByText("スライダーで大きく調整")).not.toBeInTheDocument();
    expect(
      screen.queryByText(
        "スライダーで大きく動かし、±100円ボタンまたは数値入力で細かく調整できます。"
      )
    ).not.toBeInTheDocument();

    fireEvent.change(amountInput, { target: { value: "1234" } });
    expect(screen.getByTestId("gift-message-gift-preview")).toHaveTextContent("￥1,234");

    fireEvent.click(screen.getByRole("button", { name: "金額を100円増やす" }));
    expect(amountInput).toHaveValue(1334);

    fireEvent.click(screen.getByRole("button", { name: "￥5,000" }));
    expect(amountInput).toHaveValue(5000);
  });

  it("opens gift information from the header overlay", () => {
    render(
      <GiftSessionForm channelId={5} liveStreamId={146} token="token" senderName="Alice" compact />
    );

    fireEvent.click(screen.getByRole("button", { name: "ギフトメッセージについて" }));
    const dialog = screen.getByRole("dialog", { name: "ギフトメッセージについて" });
    expect(dialog).toHaveTextContent("金額に応じた色のカードとしてチャットに表示されます");
    expect(dialog).toHaveTextContent("送り主の名前は、配信者に表示されます");
    expect(dialog).toHaveTextContent("ギフト履歴画面から返還されます");

    fireEvent.click(screen.getByRole("button", { name: "説明を閉じる" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("maps the logarithmic slider across the full valid range", () => {
    expect(sliderPositionToGiftAmount(0)).toBe(150);
    expect(sliderPositionToGiftAmount(1_000)).toBe(200_000);
    expect(sliderPositionToGiftAmount(750)).toBeGreaterThan(sliderPositionToGiftAmount(500));
    expect(giftAmountToSliderPosition(150)).toBe(0);
    expect(giftAmountToSliderPosition(200_000)).toBe(1_000);
  });

  it("keeps the chat preview in the prepared state", async () => {
    vi.mocked(createGiftSession).mockResolvedValue({
      gift_id: "gift-1",
      gift_email: "gift-1@gift.tokuly.com",
      expected_amount: 1_000,
      comment: "応援しています",
      display_style: "yellow",
      expires_at: null,
      valid_while_stream_online: true,
    });
    render(
      <GiftSessionForm channelId={5} liveStreamId={146} token="token" senderName="Alice" compact />
    );

    fireEvent.click(screen.getByRole("button", { name: "ギフトを準備する" }));

    await waitFor(() => expect(screen.getByText("送信の準備ができました")).toBeInTheDocument());
    expect(screen.getByTestId("gift-message-created-gift-preview")).toHaveTextContent("￥1,000");
    expect(screen.getByLabelText("ギフト表示プレビュー")).toContainElement(
      screen.getByTestId("gift-message-created-gift-preview")
    );
  });
});
