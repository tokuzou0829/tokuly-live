import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useSession } from "next-auth/react";
import {
  finishPlaybackSession,
  sendPlaybackProgress,
  startPlaybackSession,
} from "@/requests/playback";
import { usePlaybackSession } from "./use-playback-session";

vi.mock("next-auth/react", () => ({ useSession: vi.fn() }));
vi.mock("@/requests/playback", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/requests/playback")>();
  return {
    ...original,
    startPlaybackSession: vi.fn(),
    sendPlaybackProgress: vi.fn().mockResolvedValue({}),
    finishPlaybackSession: vi.fn().mockResolvedValue({}),
  };
});

describe("usePlaybackSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.stubGlobal("crypto", { randomUUID: vi.fn(() => "client-session-id") });
    vi.mocked(useSession).mockReturnValue({
      data: null,
      status: "unauthenticated",
      update: vi.fn(),
    });
    vi.mocked(startPlaybackSession).mockResolvedValue({
      playback_session_id: "server-session-id",
      counted: false,
      view_count: 101,
      viewer_token: "viewer-token",
    });
    vi.mocked(sendPlaybackProgress).mockResolvedValue({});
    vi.mocked(finishPlaybackSession).mockResolvedValue({});
  });

  afterEach(() => vi.useRealTimers());

  it("starts only on playing and persists an anonymous token", async () => {
    const onViewCountChange = vi.fn();
    const { result, unmount } = renderHook(() =>
      usePlaybackSession({
        contentType: "video",
        contentKey: "video-key",
        getPositionMs: () => 2500,
        onViewCountChange,
      })
    );
    expect(startPlaybackSession).not.toHaveBeenCalled();
    act(() => result.current.onPlaying());
    await waitFor(() => expect(startPlaybackSession).toHaveBeenCalledTimes(1));
    expect(startPlaybackSession).toHaveBeenCalledWith(
      expect.objectContaining({ client_session_id: "client-session-id", position_ms: 2500 }),
      expect.any(Object)
    );
    expect(localStorage.getItem("tokuly_viewer_token")).toBe("viewer-token");
    expect(onViewCountChange).toHaveBeenCalledWith(101);
    unmount();
  });

  it("sends channel credentials, progress and one finish", async () => {
    vi.mocked(useSession).mockReturnValue({
      data: {
        user: { access_token: "token" },
        activePostingIdentity: { type: "channel", channelId: 7 },
      } as never,
      status: "authenticated",
      update: vi.fn(),
    });
    const { result } = renderHook(() =>
      usePlaybackSession({
        contentType: "clip",
        contentKey: "clip-key",
        getPositionMs: () => 12000,
      })
    );
    act(() => result.current.onPlaying());
    await waitFor(() => expect(startPlaybackSession).toHaveBeenCalledTimes(1));
    expect(startPlaybackSession).toHaveBeenCalledWith(
      expect.objectContaining({ viewer_channel_id: 7 }),
      expect.objectContaining({ accessToken: "token" })
    );
    act(() => result.current.onSeeked());
    await waitFor(() => expect(sendPlaybackProgress).toHaveBeenCalled());
    await act(async () => result.current.onEnded());
    expect(finishPlaybackSession).toHaveBeenCalledTimes(1);
  });

  it("retries a failed start with the same client_session_id", async () => {
    vi.useFakeTimers();
    vi.mocked(startPlaybackSession)
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce({
        playback_session_id: "server-session-id",
        counted: true,
        view_count: 1,
      });
    const { result } = renderHook(() =>
      usePlaybackSession({ contentType: "video", contentKey: "video-key", getPositionMs: () => 0 })
    );
    act(() => result.current.onPlaying());
    await act(async () => Promise.resolve());
    expect(startPlaybackSession).toHaveBeenCalledTimes(1);
    await act(async () => vi.advanceTimersByTimeAsync(1000));
    expect(startPlaybackSession).toHaveBeenCalledTimes(2);
    const ids = vi
      .mocked(startPlaybackSession)
      .mock.calls.map(([input]) => input.client_session_id);
    expect(ids).toEqual(["client-session-id", "client-session-id"]);
  });

  it("sends periodic progress and finishes pagehide with keepalive", async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() =>
      usePlaybackSession({
        contentType: "archive",
        contentKey: "archive-key",
        getPositionMs: () => 45000,
      })
    );
    act(() => result.current.onPlaying());
    await act(async () => Promise.resolve());
    await act(async () => vi.advanceTimersByTimeAsync(15000));
    expect(sendPlaybackProgress).toHaveBeenCalledWith(
      "server-session-id",
      { position_ms: 45000, state: "playing" },
      expect.any(Object)
    );
    act(() => window.dispatchEvent(new Event("pagehide")));
    expect(finishPlaybackSession).toHaveBeenCalledWith(
      "server-session-id",
      { position_ms: 45000, reason: "pagehide" },
      expect.objectContaining({ keepalive: true })
    );
  });
});
