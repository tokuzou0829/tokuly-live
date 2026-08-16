import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import GiftAction from "./gift-action";

const mocks = vi.hoisted(() => ({ claimGift: vi.fn(), returnGift: vi.fn() }));

vi.mock("@/requests/studio", () => mocks);

describe("GiftAction", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mocks.claimGift.mockReset();
    mocks.returnGift.mockReset();
  });

  it("opens an accessed gift again", async () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    const open = vi.spyOn(window, "open").mockImplementation(() => null);
    mocks.claimGift.mockResolvedValue("https://example.test/gift");

    render(<GiftAction id={42} token="token" type="claim" accessed />);
    fireEvent.click(screen.getByRole("button", { name: "もう一度開く" }));

    expect(confirm).toHaveBeenCalledWith("アクセス済みのギフトをもう一度開きますか？");
    await waitFor(() => expect(mocks.claimGift).toHaveBeenCalledWith(42, "token"));
    expect(open).toHaveBeenCalledWith("https://example.test/gift", "_blank", "noopener,noreferrer");
  });

  it("keeps the initial claim action unchanged", () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);

    render(<GiftAction id={42} token="token" type="claim" />);
    fireEvent.click(screen.getByRole("button", { name: "受け取る" }));

    expect(window.confirm).toHaveBeenCalledWith(
      "ギフトを開きますか？開くとアクセス済みになります。"
    );
    expect(mocks.claimGift).not.toHaveBeenCalled();
  });
});
