import { act, renderHook, waitFor } from "@testing-library/react";
import React, { StrictMode, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useSession } from "next-auth/react";
import {
  finishPlaybackSession,
  PlaybackApiError,
  restorePlaybackSession,
  sendPlaybackProgress,
  startPlaybackSession,
} from "@/requests/playback";
import { usePlaybackSession } from "./use-playback-session";

vi.mock("next-auth/react", () => ({ useSession: vi.fn() }));
vi.mock("@/requests/playback", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/requests/playback")>();
  return {
    ...original,
    restorePlaybackSession: vi.fn(),
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
    vi.mocked(restorePlaybackSession).mockRejectedValue(new PlaybackApiError(404, "not found"));
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

  it("restores anonymous video, exposes its position, and activates it on playing", async () => {
    localStorage.setItem("tokuly_viewer_token", "stored-viewer-token");
    vi.mocked(restorePlaybackSession).mockResolvedValue({
      playback_session_id: "restored-session-id",
      resume_position_ms: 45000,
      view_count: 101,
    });
    const onViewCountChange = vi.fn();
    const { result } = renderHook(() =>
      usePlaybackSession({
        contentType: "video",
        contentKey: "video-key",
        getPositionMs: () => 45000,
        onViewCountChange,
      })
    );

    await waitFor(() => expect(result.current.resumePositionMs).toBe(45000));
    expect(restorePlaybackSession).toHaveBeenCalledWith(
      { content_type: "video", content_key: "video-key" },
      { viewerToken: "stored-viewer-token" }
    );
    expect(onViewCountChange).toHaveBeenCalledWith(101);
    expect(startPlaybackSession).not.toHaveBeenCalled();
    expect(sendPlaybackProgress).not.toHaveBeenCalled();

    act(() => result.current.onPlaying());
    await waitFor(() =>
      expect(sendPlaybackProgress).toHaveBeenCalledWith(
        "restored-session-id",
        { position_ms: 45000, state: "playing" },
        { viewerToken: "stored-viewer-token" }
      )
    );
    expect(startPlaybackSession).not.toHaveBeenCalled();
  });

  it("restores before playing in React Strict Mode", async () => {
    localStorage.setItem("tokuly_viewer_token", "stored-viewer-token");
    vi.mocked(restorePlaybackSession).mockResolvedValue({
      playback_session_id: "restored-session-id",
      resume_position_ms: 45000,
      view_count: 101,
    });

    const wrapper = ({ children }: { children: ReactNode }) => (
      <StrictMode>{children}</StrictMode>
    );
    const { result } = renderHook(
      () =>
        usePlaybackSession({
          contentType: "video",
          contentKey: "video-key",
          getPositionMs: () => 45000,
        }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.resumePositionMs).toBe(45000));
    expect(startPlaybackSession).not.toHaveBeenCalled();
    expect(sendPlaybackProgress).not.toHaveBeenCalled();
  });

  it("restores as soon as authentication finishes loading", async () => {
    localStorage.setItem("tokuly_viewer_token", "stored-viewer-token");
    vi.mocked(useSession).mockReturnValue({
      data: null,
      status: "loading",
      update: vi.fn(),
    });
    vi.mocked(restorePlaybackSession).mockResolvedValue({
      playback_session_id: "restored-session-id",
      resume_position_ms: 45000,
      view_count: 101,
    });
    const { result, rerender } = renderHook(() =>
      usePlaybackSession({
        contentType: "video",
        contentKey: "video-key",
        getPositionMs: () => 45000,
      })
    );

    expect(restorePlaybackSession).not.toHaveBeenCalled();
    vi.mocked(useSession).mockReturnValue({
      data: null,
      status: "unauthenticated",
      update: vi.fn(),
    });
    rerender();

    await waitFor(() => expect(result.current.resumePositionMs).toBe(45000));
    expect(startPlaybackSession).not.toHaveBeenCalled();
    expect(sendPlaybackProgress).not.toHaveBeenCalled();
  });

  it("restores a channel viewer before playing with bearer credentials", async () => {
    vi.mocked(useSession).mockReturnValue({
      data: {
        user: { access_token: "channel-token" },
        activePostingIdentity: { type: "channel", channelId: 7 },
      } as never,
      status: "authenticated",
      update: vi.fn(),
    });
    vi.mocked(restorePlaybackSession).mockResolvedValue({
      playback_session_id: "restored-channel-session-id",
      resume_position_ms: 45000,
      view_count: 101,
    });

    const { result } = renderHook(() =>
      usePlaybackSession({
        contentType: "archive",
        contentKey: "archive-key",
        getPositionMs: () => 45000,
      })
    );

    await waitFor(() => expect(result.current.resumePositionMs).toBe(45000));
    expect(restorePlaybackSession).toHaveBeenCalledWith(
      {
        content_type: "archive",
        content_key: "archive-key",
        viewer_channel_id: 7,
      },
      { viewerChannelId: 7, accessToken: "channel-token" }
    );
    expect(startPlaybackSession).not.toHaveBeenCalled();
    expect(sendPlaybackProgress).not.toHaveBeenCalled();
  });

  it("does not finish a restored session that was never played", async () => {
    localStorage.setItem("tokuly_viewer_token", "stored-viewer-token");
    vi.mocked(restorePlaybackSession).mockResolvedValue({
      playback_session_id: "restored-session-id",
      resume_position_ms: 45000,
      view_count: 101,
    });
    const { unmount } = renderHook(() =>
      usePlaybackSession({
        contentType: "archive",
        contentKey: "archive-key",
        getPositionMs: () => 45000,
      })
    );

    await waitFor(() => expect(restorePlaybackSession).toHaveBeenCalledTimes(1));
    unmount();
    expect(sendPlaybackProgress).not.toHaveBeenCalled();
    expect(finishPlaybackSession).not.toHaveBeenCalled();
  });

  it("does not attempt restoration for clips", async () => {
    localStorage.setItem("tokuly_viewer_token", "stored-viewer-token");
    const { result } = renderHook(() =>
      usePlaybackSession({ contentType: "clip", contentKey: "clip-key", getPositionMs: () => 0 })
    );

    await act(async () => Promise.resolve());
    expect(restorePlaybackSession).not.toHaveBeenCalled();
    act(() => result.current.onPlaying());
    await waitFor(() => expect(startPlaybackSession).toHaveBeenCalledTimes(1));
  });

  it("retries a temporary restore failure without starting a duplicate session", async () => {
    vi.useFakeTimers();
    localStorage.setItem("tokuly_viewer_token", "stored-viewer-token");
    vi.mocked(restorePlaybackSession)
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce({
        playback_session_id: "restored-session-id",
        resume_position_ms: 30000,
        view_count: 101,
      });
    const { result } = renderHook(() =>
      usePlaybackSession({ contentType: "video", contentKey: "video-key", getPositionMs: () => 0 })
    );

    await act(async () => Promise.resolve());
    expect(restorePlaybackSession).toHaveBeenCalledTimes(1);
    act(() => result.current.onPlaying());
    await act(async () => Promise.resolve());
    expect(startPlaybackSession).not.toHaveBeenCalled();

    await act(async () => vi.advanceTimersByTimeAsync(1000));
    expect(restorePlaybackSession).toHaveBeenCalledTimes(2);
    expect(startPlaybackSession).not.toHaveBeenCalled();
    expect(sendPlaybackProgress).toHaveBeenCalledWith(
      "restored-session-id",
      { position_ms: 0, state: "playing" },
      { viewerToken: "stored-viewer-token" }
    );
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
