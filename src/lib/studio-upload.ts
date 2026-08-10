import type { UploadSession } from "@/types/studio";

export const VIDEO_CHUNK_SIZE = 10 * 1024 * 1024;

export type VideoUploadPhase = "hashing" | "preparing" | "uploading";

export type VideoUploadOptions = {
  onPhase?: (phase: VideoUploadPhase) => void;
  onProgress?: (progress: number) => void;
  signal?: AbortSignal;
};

async function digestHex(data: BufferSource): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function tokulyFileHash(file: File): Promise<string> {
  const segmentSize = 1024 * 1024 * 1024;
  const segments: string[] = [];
  for (let offset = 0; offset < file.size; offset += segmentSize) {
    segments.push(await digestHex(await file.slice(offset, offset + segmentSize).arrayBuffer()));
  }
  return digestHex(new TextEncoder().encode(segments.join("")));
}

export async function uploadVideoChunks(
  file: File,
  studioSession: UploadSession,
  options: VideoUploadOptions = {}
): Promise<void> {
  const { onPhase, onProgress, signal } = options;
  onPhase?.("hashing");
  const fileHash = await tokulyFileHash(file);
  onPhase?.("preparing");
  const start = await fetch("https://live-data.tokuly.com/upload/start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      file_hash: fileHash,
      file_name: file.name,
      file_size: file.size,
      tokuly_upload_session_id: studioSession.session_id,
    }),
    signal,
  });
  const startPayload = await start.json().catch(() => null);
  if (!start.ok)
    throw new Error(uploadErrorMessage(startPayload, "動画の転送を開始できませんでした。"));
  const payload = startPayload as { session_id: string };
  if (!payload?.session_id)
    throw new Error("アップロードサービスから転送情報を取得できませんでした。");
  const total = Math.ceil(file.size / VIDEO_CHUNK_SIZE);
  onPhase?.("uploading");
  onProgress?.(0);
  for (let index = 0; index < total; index += 1) {
    const form = new FormData();
    form.set("session_id", payload.session_id);
    form.set("chunk_index", String(index));
    form.set("chunk", file.slice(index * VIDEO_CHUNK_SIZE, (index + 1) * VIDEO_CHUNK_SIZE));
    const response = await fetch("https://live-data.tokuly.com/upload", {
      method: "POST",
      body: form,
      signal,
    });
    if (!response.ok) {
      const errorPayload = await response.json().catch(() => null);
      throw new Error(
        uploadErrorMessage(errorPayload, `${index + 1}個目のチャンクを転送できませんでした。`)
      );
    }
    onProgress?.(Math.round(((index + 1) / total) * 100));
  }
}

function uploadErrorMessage(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== "object") return fallback;
  const body = payload as Record<string, unknown>;
  if (typeof body.message === "string" && body.message.trim()) return body.message;
  if (typeof body.error === "string" && body.error.trim()) return body.error;
  if (body.errors && typeof body.errors === "object") {
    const first = Object.values(body.errors as Record<string, unknown>).flatMap((value) =>
      Array.isArray(value) ? value : [value]
    )[0];
    if (typeof first === "string" && first.trim()) return first;
  }
  return fallback;
}
