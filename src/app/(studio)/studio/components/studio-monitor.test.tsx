import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import StudioMonitor from "./studio-monitor";

vi.mock("@/components/tokuly-player-preview", () => ({
  default: ({ streamKey }: { streamKey: string }) => <div>{`player:${streamKey}`}</div>,
}));

describe("Studio monitor", () => {
  it("renders the shared Tokuly player component directly", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    render(<StudioMonitor streamKey="public-key" />);
    expect(screen.getByText("player:public-key")).toBeInTheDocument();
    expect(document.querySelector("iframe")).not.toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
