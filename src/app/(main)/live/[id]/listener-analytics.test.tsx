import React from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ListenerAnalyticsProvider, useListenerAnalytics } from "./listener-analytics";

const handlers = new Map<string, (...args: any[]) => void>();
const socket = {
  on: vi.fn((event: string, handler: (...args: any[]) => void) => {
    handlers.set(event, handler);
    return socket;
  }),
  off: vi.fn(),
  emit: vi.fn(),
  connect: vi.fn(() => handlers.get("connect")?.()),
  disconnect: vi.fn(),
};

vi.mock("socket.io-client", () => ({
  default: vi.fn(() => socket),
}));

function Harness() {
  const { listenerCount, startListening, stopListening } = useListenerAnalytics();
  return (
    <>
      <span>{listenerCount}</span>
      <button onClick={startListening}>start</button>
      <button onClick={stopListening}>stop</button>
    </>
  );
}

describe("listener analytics", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    handlers.clear();
    window.localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("starts only after room join, heartbeats while playing, and stops", () => {
    render(
      <ListenerAnalyticsProvider session={null} streamId={123}>
        <Harness />
      </ListenerAnalyticsProvider>
    );

    fireEvent.click(screen.getByText("start"));
    expect(socket.emit).not.toHaveBeenCalledWith("listener:start", expect.anything());

    act(() => handlers.get("chat:joined")?.());
    expect(socket.emit).toHaveBeenCalledWith("listener:start", {
      listener_id: expect.stringMatching(/^[a-f0-9]{32}$/),
    });

    act(() => vi.advanceTimersByTime(15_000));
    expect(socket.emit).toHaveBeenCalledWith("listener:heartbeat", {});

    fireEvent.click(screen.getByText("stop"));
    expect(socket.emit).toHaveBeenCalledWith("listener:stop", {});
    const heartbeatCalls = socket.emit.mock.calls.filter(
      ([event]) => event === "listener:heartbeat"
    ).length;
    act(() => vi.advanceTimersByTime(15_000));
    expect(socket.emit.mock.calls.filter(([event]) => event === "listener:heartbeat")).toHaveLength(
      heartbeatCalls
    );
  });

  it("updates the count only for the current numeric stream id", () => {
    render(
      <ListenerAnalyticsProvider session={null} streamId={123}>
        <Harness />
      </ListenerAnalyticsProvider>
    );

    act(() =>
      handlers.get("listener:count")?.({
        stream_id: 999,
        count: 8,
        measured_at: "2026-08-06T12:34:56.000Z",
      })
    );
    expect(screen.getByText("0")).toBeInTheDocument();

    act(() =>
      handlers.get("listener:count")?.({
        stream_id: 123,
        count: 4,
        measured_at: "2026-08-06T12:34:56.000Z",
      })
    );
    expect(screen.getByText("4")).toBeInTheDocument();
  });
});
