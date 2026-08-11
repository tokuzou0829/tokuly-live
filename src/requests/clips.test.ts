import { beforeEach, describe, expect, it, vi } from "vitest";
import { ClipApiError, getClip, getLatestClips, getVideoClips } from "./clips";

describe("Clip public API client", () => {
  beforeEach(() => vi.stubGlobal("fetch", vi.fn()));

  it("loads an individual clip with optional bearer authentication", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ data: { clip_key: "A/B", title: "Clip" } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    await expect(getClip("A/B", "token")).resolves.toEqual(
      expect.objectContaining({ clip_key: "A/B", title: "Clip" })
    );
    expect(fetch).toHaveBeenCalledWith(
      "https://api.example.test/v1/live/clips/A%2FB",
      expect.objectContaining({
        cache: "no-store",
        headers: expect.objectContaining({ Authorization: "Bearer token" }),
      })
    );
  });

  it("loads a paginated video clip list", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ data: [], links: {}, meta: { total: 0 } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );
    await getVideoClips(34, { page: 2, perPage: 3 });
    expect(fetch).toHaveBeenCalledWith(
      "https://api.example.test/v1/live/streams/34/clips?page=2&per_page=3",
      expect.any(Object)
    );
  });

  it("loads the latest public clip feed without authentication", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ data: [], links: {}, meta: { total: 0 } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    await getLatestClips({ page: 2, perPage: 8 });

    expect(fetch).toHaveBeenCalledWith(
      "https://api.example.test/v1/live/clips?page=2&per_page=8",
      expect.objectContaining({
        cache: "no-store",
        headers: { Accept: "application/json" },
      })
    );
  });

  it("keeps public API status and field errors", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ message: "Forbidden", errors: { clip: ["Private"] } }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      })
    );
    const error = await getClip("private").catch((caught) => caught);
    expect(error).toBeInstanceOf(ClipApiError);
    expect(error).toMatchObject({
      status: 403,
      message: "Forbidden",
      fields: { clip: ["Private"] },
    });
  });
});
