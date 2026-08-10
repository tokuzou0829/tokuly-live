import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import StudioCreateMenu from "./studio-create-menu";

describe("Studio content creation menu", () => {
  beforeEach(() => {
    vi.stubGlobal("PointerEvent", MouseEvent);
    Object.defineProperty(HTMLElement.prototype, "hasPointerCapture", {
      configurable: true,
      value: vi.fn(() => false),
    });
    Object.defineProperty(HTMLElement.prototype, "setPointerCapture", {
      configurable: true,
      value: vi.fn(),
    });
  });

  afterEach(cleanup);

  it("shows video and live creation choices on hover", async () => {
    render(<StudioCreateMenu />);

    fireEvent.mouseEnter(screen.getByRole("button", { name: "コンテンツを作成" }));

    expect(await screen.findByRole("menuitem", { name: "動画をアップロード" })).toHaveAttribute(
      "href",
      "/studio/videos/new"
    );
    expect(screen.getByRole("menuitem", { name: "ライブ配信を作成" })).toHaveAttribute(
      "href",
      "/studio/streams/new"
    );
  });

  it("toggles the menu when the trigger is clicked", async () => {
    render(<StudioCreateMenu variant="icon" />);
    const trigger = screen.getByRole("button", { name: "作成メニューを開く" });

    fireEvent.pointerDown(trigger, { button: 0, ctrlKey: false });
    expect(await screen.findByRole("menuitem", { name: "動画をアップロード" })).toBeInTheDocument();

    fireEvent.pointerDown(trigger, { button: 0, ctrlKey: false });
    await waitFor(() =>
      expect(screen.queryByRole("menuitem", { name: "動画をアップロード" })).not.toBeInTheDocument()
    );
  });
});
