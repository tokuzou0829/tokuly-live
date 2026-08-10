import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createStudioChannel,
  getStudioChannels,
  getStudioStreams,
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
});
