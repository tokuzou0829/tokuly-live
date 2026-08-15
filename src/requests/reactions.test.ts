import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getStreamReaction,
  ReactionApiError,
  removeStreamReaction,
  setStreamReaction,
} from "./reactions";

const response = (reaction: "like" | "dislike" | null, likes: number, dislikes: number) =>
  new Response(
    JSON.stringify({
      data: { reaction, like_count: likes, dislike_count: dislikes },
    }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );

describe("stream reaction API client", () => {
  beforeEach(() => vi.stubGlobal("fetch", vi.fn()));

  it("gets the current reaction with bearer authentication", async () => {
    vi.mocked(fetch).mockResolvedValue(response("like", 12, 2));

    await expect(getStreamReaction(34, "token")).resolves.toEqual({
      reaction: "like",
      like_count: 12,
      dislike_count: 2,
    });
    expect(fetch).toHaveBeenCalledWith(
      "https://api.example.test/v1/live/streams/34/reaction",
      expect.objectContaining({
        cache: "no-store",
        headers: expect.objectContaining({ Authorization: "Bearer token" }),
      })
    );
  });

  it("sets and removes a reaction using the documented methods", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(response("dislike", 11, 3))
      .mockResolvedValueOnce(response(null, 11, 2));

    await setStreamReaction(34, "dislike", "token");
    expect(fetch).toHaveBeenLastCalledWith(
      "https://api.example.test/v1/live/streams/34/reaction",
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({ reaction: "dislike" }),
        headers: expect.objectContaining({ "Content-Type": "application/json" }),
      })
    );

    await removeStreamReaction(34, "token");
    expect(fetch).toHaveBeenLastCalledWith(
      "https://api.example.test/v1/live/streams/34/reaction",
      expect.objectContaining({ method: "DELETE" })
    );
  });

  it.each([401, 409, 422])("keeps API error status %s", async (status) => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ message: `error-${status}` }), {
        status,
        headers: { "Content-Type": "application/json" },
      })
    );

    const error = await setStreamReaction(34, "like", "token").catch((caught) => caught);
    expect(error).toBeInstanceOf(ReactionApiError);
    expect(error).toMatchObject({ status, message: `error-${status}` });
  });
});
