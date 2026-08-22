import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createStudioChannel,
  createStudioClip,
  addStudioCommentReaction,
  deleteStudioClip,
  deleteStudioComment,
  getStudioChannelComments,
  getStudioCommentReplies,
  getStudioContentClips,
  getStudioCreatedClips,
  getStudioChannels,
  getStreamServerInfo,
  getStudioStreams,
  getStudioReactionAnalytics,
  getStudioStreamReactionAnalytics,
  getStudioStreamComments,
  removeStudioCommentReaction,
  StudioApiError,
  updateStudioStream,
} from "./studio";

describe("Studio API client", () => {
  beforeEach(() => vi.stubGlobal("fetch", vi.fn()));

  it("loads Studio channels with bearer authentication and no cache", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ data: [{ id: 7, name: "Channel" }] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );
    await expect(getStudioChannels("secret-token")).resolves.toEqual([
      expect.objectContaining({ id: 7, name: "Channel" }),
    ]);
    expect(fetch).toHaveBeenCalledWith(
      "https://api.example.test/v1/live/studio/channels",
      expect.objectContaining({
        cache: "no-store",
        headers: expect.objectContaining({ Authorization: "Bearer secret-token" }),
      })
    );
  });

  it("loads the RTMP server URL from the Studio API", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ url: "rtmp://rtmp.live.tokuly.com/live2" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    await expect(getStreamServerInfo("secret-token")).resolves.toEqual({
      url: "rtmp://rtmp.live.tokuly.com/live2",
    });
    expect(fetch).toHaveBeenCalledWith(
      "https://api.example.test/v1/live/studio/stream-server-info",
      expect.objectContaining({
        cache: "no-store",
        headers: expect.objectContaining({ Authorization: "Bearer secret-token" }),
      })
    );
  });

  it("loads channel reaction analytics", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ data: { timezone: "Asia/Tokyo", total_likes: 3 } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    await expect(getStudioReactionAnalytics(12, "token")).resolves.toEqual(
      expect.objectContaining({ timezone: "Asia/Tokyo", total_likes: 3 })
    );
    expect(fetch).toHaveBeenCalledWith(
      "https://api.example.test/v1/live/studio/channels/12/reaction-analytics",
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer token" }),
      })
    );
  });

  it("loads reaction analytics for one stream", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          data: { scope: { type: "stream", id: 34 }, timezone: "Asia/Tokyo", total_likes: 2 },
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      )
    );

    await expect(getStudioStreamReactionAnalytics(34, "token")).resolves.toEqual(
      expect.objectContaining({ scope: { type: "stream", id: 34 }, total_likes: 2 })
    );
    expect(fetch).toHaveBeenCalledWith(
      "https://api.example.test/v1/live/studio/streams/34/reaction-analytics",
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer token" }),
      })
    );
  });

  it("creates a Studio channel as JSON when no icon is selected", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ data: { id: 12, name: "New Channel" } }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      })
    );

    await expect(
      createStudioChannel({ name: "New Channel", handle: "new-channel" }, "token")
    ).resolves.toEqual(expect.objectContaining({ id: 12, name: "New Channel" }));

    expect(fetch).toHaveBeenCalledWith(
      "https://api.example.test/v1/live/studio/channels",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ name: "New Channel", handle: "new-channel" }),
        headers: expect.objectContaining({
          Authorization: "Bearer token",
          "Content-Type": "application/json",
        }),
      })
    );
  });

  it("creates a Studio channel as multipart data when an icon is selected", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ data: { id: 13, name: "Icon Channel" } }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      })
    );
    const icon = new File(["icon"], "icon.webp", { type: "image/webp" });

    await createStudioChannel({ name: "Icon Channel", handle: "icon-channel", icon }, "token");

    const init = vi.mocked(fetch).mock.calls[0][1] as RequestInit;
    const body = init.body as FormData;
    expect(init.method).toBe("POST");
    expect(body.get("name")).toBe("Icon Channel");
    expect(body.get("handle")).toBe("icon-channel");
    expect(body.get("icon")).toBe(icon);
    expect((init.headers as Record<string, string>)["Content-Type"]).toBeUndefined();
  });

  it("preserves the channel limit conflict response", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ message: "A maximum of 5 Studio channels is allowed." }), {
        status: 409,
        headers: { "Content-Type": "application/json" },
      })
    );

    const error = await createStudioChannel(
      { name: "Sixth Channel", handle: "sixth-channel" },
      "token"
    ).catch((caught) => caught);

    expect(error).toBeInstanceOf(StudioApiError);
    expect(error).toMatchObject({
      status: 409,
      message: "A maximum of 5 Studio channels is allowed.",
    });
  });

  it("uses numeric channel IDs and encodes list filters", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ data: [], links: {}, meta: { total: 0 } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );
    await getStudioStreams(42, "token", { type: "live", status: "online", page: 2, per_page: 100 });
    expect(fetch).toHaveBeenCalledWith(
      "https://api.example.test/v1/live/studio/channels/42/streams?type=live&status=online&page=2&per_page=100",
      expect.any(Object)
    );
  });

  it("uses method override only for file updates", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ data: { id: 9 } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );
    const form = new FormData();
    form.set("thumbnail", new Blob(["image"], { type: "image/png" }), "image.png");
    await updateStudioStream(9, form, "token");
    const init = vi.mocked(fetch).mock.calls[0][1] as RequestInit;
    expect(init.method).toBe("POST");
    expect((init.body as FormData).get("_method")).toBe("PATCH");
    expect((init.headers as Record<string, string>)["Content-Type"]).toBeUndefined();
  });

  it("preserves Laravel field errors and status codes", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ message: "Invalid", errors: { title: ["Required"] } }), {
        status: 422,
        headers: { "Content-Type": "application/json" },
      })
    );
    const error = await getStudioChannels("token").catch((caught) => caught);
    expect(error).toBeInstanceOf(StudioApiError);
    expect(error).toMatchObject({
      status: 422,
      message: "Invalid",
      fields: { title: ["Required"] },
    });
  });

  it("creates a clip using the selected channel path and API field names", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ data: { clip_key: "clip-key", title: "見どころ" } }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      })
    );
    const input = {
      title: "見どころ",
      source_video_id: 34,
      start_seconds: 12.3,
      end_seconds: 42.5,
    };
    await createStudioClip(12, input, "token");
    expect(fetch).toHaveBeenCalledWith(
      "https://api.example.test/v1/live/studio/channels/12/clips",
      expect.objectContaining({ method: "POST", body: JSON.stringify(input) })
    );
  });

  it("loads both Studio clip views with source filters", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ data: [], links: {}, meta: { total: 0 } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );
    await getStudioCreatedClips(12, "token", { source_video_id: 34, page: 2, per_page: 20 });
    expect(fetch).toHaveBeenLastCalledWith(
      "https://api.example.test/v1/live/studio/channels/12/clips/created?source_video_id=34&page=2&per_page=20",
      expect.any(Object)
    );
    await getStudioContentClips(12, "token", { source_video_id: 34, page: 1 });
    expect(fetch).toHaveBeenLastCalledWith(
      "https://api.example.test/v1/live/studio/channels/12/clips/on-content?source_video_id=34&page=1",
      expect.any(Object)
    );
  });

  it("deletes an encoded clip key without parsing a response body", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 204 }));
    await expect(deleteStudioClip(12, "A/B", "token")).resolves.toBeNull();
    expect(fetch).toHaveBeenCalledWith(
      "https://api.example.test/v1/live/studio/channels/12/clips/A%2FB",
      expect.objectContaining({ method: "DELETE" })
    );
  });

  it("loads channel comments with encoded Studio filters", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ data: [], links: {}, meta: { total: 0 } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    await getStudioChannelComments(12, "token", {
      view: "threaded",
      query: "ありがとう & hello",
      author: "viewer name",
      author_type: "user",
      from: "2026-08-01T00:00:00+09:00",
      to: "2026-08-31T23:59:59+09:00",
      stream_id: 34,
      per_page: 20,
      page: 2,
    });

    const url = String(vi.mocked(fetch).mock.calls[0][0]);
    expect(url).toContain("/v1/live/studio/channels/12/comments?");
    const params = new URL(url).searchParams;
    expect(Object.fromEntries(params)).toEqual({
      view: "threaded",
      query: "ありがとう & hello",
      author: "viewer name",
      author_type: "user",
      from: "2026-08-01T00:00:00+09:00",
      to: "2026-08-31T23:59:59+09:00",
      stream_id: "34",
      per_page: "20",
      page: "2",
    });
  });

  it("loads stream comments and paginates direct replies", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ data: [], links: {}, meta: { total: 0 } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );
    await getStudioStreamComments(34, "token", { view: "flat", page: 1 });
    expect(fetch).toHaveBeenLastCalledWith(
      "https://api.example.test/v1/live/studio/streams/34/comments?view=flat&page=1",
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer token" }),
      })
    );

    await getStudioCommentReplies(34, 100, "token", 153);
    expect(fetch).toHaveBeenLastCalledWith(
      "https://api.example.test/v1/live/studio/streams/34/comments/100/replies?after_id=153",
      expect.any(Object)
    );
  });

  it("deletes a Studio comment without parsing the 204 response", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 204 }));
    await expect(deleteStudioComment(34, 100, "token")).resolves.toBeNull();
    expect(fetch).toHaveBeenCalledWith(
      "https://api.example.test/v1/live/studio/streams/34/comments/100",
      expect.objectContaining({ method: "DELETE" })
    );
  });

  it("adds a creator reaction without a request body and returns its timestamp", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ data: { creator_reacted_at: "2026-08-15T12:00:00+09:00" } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    await expect(addStudioCommentReaction(34, 100, "token")).resolves.toBe(
      "2026-08-15T12:00:00+09:00"
    );
    expect(fetch).toHaveBeenCalledWith(
      "https://api.example.test/v1/live/studio/streams/34/comments/100/reaction",
      expect.objectContaining({
        method: "PUT",
        headers: expect.objectContaining({ Authorization: "Bearer token" }),
      })
    );
    const init = vi.mocked(fetch).mock.calls[0][1] as RequestInit;
    expect(init.body).toBeUndefined();
  });

  it("removes a creator reaction without parsing the 204 response", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 204 }));

    await expect(removeStudioCommentReaction(34, 100, "token")).resolves.toBeNull();
    expect(fetch).toHaveBeenCalledWith(
      "https://api.example.test/v1/live/studio/streams/34/comments/100/reaction",
      expect.objectContaining({
        method: "DELETE",
        headers: expect.objectContaining({ Authorization: "Bearer token" }),
      })
    );
  });
});
