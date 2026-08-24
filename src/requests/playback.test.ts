import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearWatchHistory,
  deleteWatchHistoryItem,
  getWatchHistory,
  PlaybackApiError,
  restorePlaybackSession,
  startPlaybackSession,
  watchHistoryHref,
} from "./playback";

describe("playback requests", () => {
  beforeEach(() => vi.stubGlobal("fetch", vi.fn()));

  it("starts anonymous playback with only the anonymous viewer header", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          data: { playback_session_id: "server-id", counted: true, view_count: 10 },
        }),
        { status: 201, headers: { "Content-Type": "application/json" } }
      )
    );
    await startPlaybackSession(
      {
        content_type: "video",
        content_key: "stream-key",
        client_session_id: "client-id",
        position_ms: 0,
      },
      { viewerToken: "anonymous-token" }
    );
    const init = vi.mocked(fetch).mock.calls[0][1] as RequestInit;
    expect(init.headers).toMatchObject({ "X-Tokuly-Viewer": "anonymous-token" });
    expect(init.headers).not.toHaveProperty("Authorization");
  });

  it("uses bearer authentication and viewer_channel_id for channel playback", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          data: { playback_session_id: "server-id", counted: false, view_count: 20 },
        }),
        { status: 201, headers: { "Content-Type": "application/json" } }
      )
    );
    await startPlaybackSession(
      {
        content_type: "archive",
        content_key: "archive-key",
        client_session_id: "client-id",
        viewer_channel_id: 12,
        position_ms: 1000,
      },
      { accessToken: "secret", viewerToken: "must-not-be-used" }
    );
    const init = vi.mocked(fetch).mock.calls[0][1] as RequestInit;
    expect(init.headers).toMatchObject({ Authorization: "Bearer secret" });
    expect(init.headers).not.toHaveProperty("X-Tokuly-Viewer");
    expect(JSON.parse(String(init.body))).toMatchObject({ viewer_channel_id: 12 });
  });

  it("restores anonymous playback with the stored viewer token", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            playback_session_id: "restored-id",
            resume_position_ms: 45000,
            view_count: 101,
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );

    await expect(
      restorePlaybackSession(
        { content_type: "video", content_key: "stream-key" },
        { viewerToken: "anonymous-token" }
      )
    ).resolves.toMatchObject({ playback_session_id: "restored-id", resume_position_ms: 45000 });

    const [url, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.example.test/v1/live/playback-sessions/restore");
    expect(init.headers).toMatchObject({ "X-Tokuly-Viewer": "anonymous-token" });
    expect(JSON.parse(String(init.body))).toEqual({
      content_type: "video",
      content_key: "stream-key",
    });
  });

  it("restores channel playback with bearer authentication", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          data: { playback_session_id: "restored-id", resume_position_ms: 1000, view_count: 20 },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );

    await restorePlaybackSession(
      { content_type: "archive", content_key: "archive-key", viewer_channel_id: 12 },
      { accessToken: "secret", viewerToken: "must-not-be-used" }
    );

    const init = vi.mocked(fetch).mock.calls[0][1] as RequestInit;
    expect(init.headers).toMatchObject({ Authorization: "Bearer secret" });
    expect(init.headers).not.toHaveProperty("X-Tokuly-Viewer");
    expect(JSON.parse(String(init.body))).toMatchObject({ viewer_channel_id: 12 });
  });

  it("exposes a 404 restore response as PlaybackApiError", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ message: "not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      })
    );

    await expect(
      restorePlaybackSession(
        { content_type: "video", content_key: "stream-key" },
        { viewerToken: "anonymous-token" }
      )
    ).rejects.toMatchObject({ status: 404 } satisfies Partial<PlaybackApiError>);
  });

  it("normalizes history content and creates a resume URL", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          data: [
            {
              content_type: "clip",
              content_key: "clip/key",
              content: {
                title: "見どころ",
                thumbnail_url: "https://example.test/clip.jpg",
                duration_seconds: 60,
                view_count: 88,
                channel: { name: "Channel", handle: "channel" },
              },
              resume_position_ms: 12500,
              total_watched_seconds: 20,
              completed: false,
              completed_at: null,
              last_watched_at: "2026-08-24T00:00:00Z",
            },
          ],
          links: {},
          meta: { current_page: 1, last_page: 1, per_page: 20, total: 1, from: 1, to: 1 },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );
    const result = await getWatchHistory(7, "token", { per_page: 20 });
    expect(result.data[0]).toMatchObject({
      title: "見どころ",
      channel_name: "Channel",
      view_count: 88,
    });
    expect(watchHistoryHref(result.data[0])).toBe("/clip/clip%2Fkey?t=12");
  });

  it("normalizes Laravel pagination fields returned at the top level", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          data: [],
          current_page: 2,
          last_page: 4,
          per_page: 20,
          total: 63,
          from: 21,
          to: 40,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );
    const result = await getWatchHistory(7, "token", { page: 2, per_page: 20 });
    expect(result.meta).toEqual({
      current_page: 2,
      last_page: 4,
      per_page: 20,
      total: 63,
      from: 21,
      to: 40,
    });
  });

  it("deletes one encoded history item or the whole channel history", async () => {
    vi.mocked(fetch).mockImplementation(async () => new Response(null, { status: 204 }));
    await deleteWatchHistoryItem(7, "clip", "clip/key", "token");
    await clearWatchHistory(7, "token");
    expect(vi.mocked(fetch).mock.calls.map(([url, init]) => [url, init?.method])).toEqual([
      ["https://api.example.test/v1/live/channels/7/watch-history/clip/clip%2Fkey", "DELETE"],
      ["https://api.example.test/v1/live/channels/7/watch-history", "DELETE"],
    ]);
  });
});
