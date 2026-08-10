import React from "react";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useWatchParty } from "./use-watch-party";
import type { WatchPartyJoinResult } from "@/types/watch-party";

const mocks = vi.hoisted(() => ({
  io: vi.fn(),
  joinResult: null as WatchPartyJoinResult | null,
  joinResponse: null as unknown,
  socket: null as ReturnType<typeof createSocketMock> | null,
}));

vi.mock("socket.io-client", () => ({ io: mocks.io }));

function createSocketMock() {
  const handlers = new Map<string, Set<(...args: any[]) => void>>();
  const socket = {
    on: vi.fn((event: string, handler: (...args: any[]) => void) => {
      const eventHandlers = handlers.get(event) ?? new Set();
      eventHandlers.add(handler);
      handlers.set(event, eventHandlers);
      return socket;
    }),
    off: vi.fn((event: string, handler: (...args: any[]) => void) => {
      handlers.get(event)?.delete(handler);
      return socket;
    }),
    connect: vi.fn(() => {
      handlers.get("connect")?.forEach((handler) => handler());
      return socket;
    }),
    disconnect: vi.fn(),
    emit: vi.fn((event: string, _payload: unknown, ack?: (response: unknown) => void) => {
      if (event === "party:join" && ack) {
        ack(mocks.joinResponse);
      }
      if ((event === "party:playback" || event === "party:message") && ack) {
        ack({ ok: true, data: {} });
      }
      return socket;
    }),
    trigger(event: string, payload?: unknown) {
      handlers.get(event)?.forEach((handler) => handler(payload));
    },
  };
  return socket;
}

function participant(role: "host" | "participant") {
  return { id: "socket-1", image: "", name: "Alice", role };
}

function createVideo() {
  const video = document.createElement("video");
  Object.defineProperty(video, "play", { value: vi.fn().mockResolvedValue(undefined) });
  Object.defineProperty(video, "pause", { value: vi.fn() });
  return video;
}

describe("useWatchParty", () => {
  beforeEach(() => {
    const self = participant("host");
    mocks.joinResult = {
      self,
      users: [self],
      serverTime: Date.now(),
      playback: { currentTime: 0, playing: false, serverTime: Date.now() },
    };
    mocks.joinResponse = { ok: true, data: mocks.joinResult };
    mocks.socket = createSocketMock();
    mocks.io.mockReturnValue(mocks.socket);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("joins after handlers are registered and removes every handler on cleanup", async () => {
    const video = createVideo();
    const roomId = crypto.randomUUID();
    const { result, unmount } = renderHook(() =>
      useWatchParty({ accessToken: "token", roomId, video, videoId: 42 })
    );

    await waitFor(() => expect(result.current.connectionState).toBe("connected"));
    expect(mocks.io).toHaveBeenCalledWith(
      "https://live-data.tokuly.com",
      expect.objectContaining({ auth: { accessToken: "token" }, autoConnect: false })
    );
    expect(mocks.socket?.emit).toHaveBeenCalledWith(
      "party:join",
      expect.objectContaining({ videoId: 42 }),
      expect.any(Function)
    );

    act(() => video.dispatchEvent(new Event("play")));
    expect(mocks.socket?.emit).toHaveBeenCalledWith(
      "party:playback",
      expect.objectContaining({ reason: "play" }),
      expect.any(Function)
    );

    act(() => {
      mocks.socket?.trigger("party:presence", {
        users: [{ ...participant("participant"), id: "socket-1" }],
      });
    });
    expect(result.current.isHost).toBe(false);

    unmount();
    expect(mocks.socket?.disconnect).toHaveBeenCalledOnce();
    expect(mocks.socket?.off).toHaveBeenCalledWith("party:presence", expect.any(Function));
    expect(mocks.socket?.off).toHaveBeenCalledWith("party:playback", expect.any(Function));
  });

  it("applies remote playback to participants without echoing it", async () => {
    const self = participant("participant");
    mocks.joinResult = {
      self,
      users: [self],
      serverTime: Date.now(),
      playback: { currentTime: 0, playing: false, serverTime: Date.now() },
    };
    mocks.joinResponse = { ok: true, data: mocks.joinResult };
    const video = createVideo();
    const roomId = crypto.randomUUID();
    const { result } = renderHook(() => useWatchParty({ roomId, video, videoId: 42 }));
    await waitFor(() => expect(result.current.connectionState).toBe("connected"));
    mocks.socket?.emit.mockClear();

    act(() => {
      mocks.socket?.trigger("party:playback", {
        currentTime: 20,
        playing: true,
        serverTime: Date.now(),
      });
    });

    expect(video.currentTime).toBeCloseTo(20, 0);
    expect(video.play).toHaveBeenCalled();
    expect(mocks.socket?.emit).not.toHaveBeenCalledWith(
      "party:playback",
      expect.anything(),
      expect.anything()
    );
  });

  it("turns malformed server data into a recoverable protocol error", async () => {
    const self = participant("participant");
    mocks.joinResult = {
      self,
      users: [self],
      serverTime: Date.now(),
      playback: { currentTime: 0, playing: false, serverTime: Date.now() },
    };
    mocks.joinResponse = { ok: true, data: mocks.joinResult };
    const video = createVideo();
    const roomId = crypto.randomUUID();
    const { result } = renderHook(() => useWatchParty({ roomId, video, videoId: 42 }));
    await waitFor(() => expect(result.current.connectionState).toBe("connected"));

    act(() => {
      mocks.socket?.trigger("party:presence", null);
      mocks.socket?.trigger("party:playback", { currentTime: "not-a-number" });
      mocks.socket?.trigger("party:message", []);
      mocks.socket?.trigger("party:error", { message: null });
    });

    expect(result.current.connectionState).toBe("connected");
    expect(result.current.users).toEqual([self]);
    expect(result.current.messages).toEqual([]);
    expect(result.current.error).toMatch(/不正/);
  });

  it("does not dereference a malformed join acknowledgement", async () => {
    mocks.joinResponse = null;
    const video = createVideo();
    const roomId = crypto.randomUUID();
    const { result } = renderHook(() => useWatchParty({ roomId, video, videoId: 42 }));

    await waitFor(() => expect(result.current.connectionState).toBe("error"));
    expect(result.current.error).toMatch(/不正/);
  });
});
