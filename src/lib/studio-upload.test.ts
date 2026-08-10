import { webcrypto } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { tokulyFileHash, uploadVideoChunks } from "./studio-upload";
import type { UploadSession } from "@/types/studio";

const session = { session_id: "tokuly-session" } as UploadSession;

describe("Studio video upload", () => {
  beforeEach(() => {
    vi.stubGlobal("crypto", webcrypto);
    vi.stubGlobal("fetch", vi.fn());
    vi.stubGlobal(
      "FormData",
      class {
        set() {}
      }
    );
  });

  it("calculates the documented double SHA-256 for a file segment", async () => {
    const bytes = new TextEncoder().encode("tokuly");
    const file = {
      size: bytes.byteLength,
      slice: () => ({ arrayBuffer: async () => bytes.buffer }),
    } as unknown as File;
    const inner = await webcrypto.subtle.digest("SHA-256", bytes);
    const innerHex = Array.from(new Uint8Array(inner), (value) =>
      value.toString(16).padStart(2, "0")
    ).join("");
    const expected = await webcrypto.subtle.digest("SHA-256", new TextEncoder().encode(innerHex));
    const expectedHex = Array.from(new Uint8Array(expected), (value) =>
      value.toString(16).padStart(2, "0")
    ).join("");
    await expect(tokulyFileHash(file)).resolves.toBe(expectedHex);
  });

  it("reports hashing, preparation, and chunk upload phases", async () => {
    const bytes = new TextEncoder().encode("video");
    const file = {
      name: "video.custom",
      size: bytes.byteLength,
      slice: () => ({ arrayBuffer: async () => bytes.buffer }),
    } as unknown as File;
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ session_id: "transfer-session" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      )
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    const phases: string[] = [];
    const progress: number[] = [];

    await uploadVideoChunks(file, session, {
      onPhase: (phase) => phases.push(phase),
      onProgress: (value) => progress.push(value),
    });

    expect(phases).toEqual(["hashing", "preparing", "uploading"]);
    expect(progress).toEqual([0, 100]);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("passes arbitrary names and sizes to server validation and shows its error", async () => {
    const empty = new TextEncoder().encode("").buffer;
    const file = {
      name: "recording.unknown",
      size: 1024 * 1024 * 1024 + 1,
      slice: () => ({ arrayBuffer: async () => empty }),
    } as unknown as File;
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ message: "この動画サイズは受け付けられません。" }), {
        status: 422,
        headers: { "Content-Type": "application/json" },
      })
    );

    await expect(uploadVideoChunks(file, session)).rejects.toThrow(
      "この動画サイズは受け付けられません。"
    );
    expect(fetch).toHaveBeenCalledOnce();
    const request = vi.mocked(fetch).mock.calls[0][1] as RequestInit;
    expect(JSON.parse(String(request.body))).toMatchObject({
      file_name: "recording.unknown",
      file_size: 1024 * 1024 * 1024 + 1,
    });
  });
});
