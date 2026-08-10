export const AUTO_THUMBNAIL_WIDTH = 1920;
export const AUTO_THUMBNAIL_HEIGHT = 1080;
export const AUTO_THUMBNAIL_QUALITY = 0.85;

export type CoverDrawRect = { x: number; y: number; width: number; height: number };

export function automaticThumbnailCaptureTime(duration: number): number {
  if (!Number.isFinite(duration) || duration <= 0) return 0;
  return Math.min(duration * 0.1, Math.max(0, duration - 0.01));
}

export function coverDrawRect(
  sourceWidth: number,
  sourceHeight: number,
  targetWidth: number,
  targetHeight: number
): CoverDrawRect {
  const scale = Math.max(targetWidth / sourceWidth, targetHeight / sourceHeight);
  const width = sourceWidth * scale;
  const height = sourceHeight * scale;
  return { x: (targetWidth - width) / 2, y: (targetHeight - height) / 2, width, height };
}

function waitForVideoEvent(
  video: HTMLVideoElement,
  event: "loadedmetadata" | "loadeddata" | "seeked"
) {
  return new Promise<void>((resolve, reject) => {
    const cleanup = () => {
      video.removeEventListener(event, ready);
      video.removeEventListener("error", failed);
    };
    const ready = () => {
      cleanup();
      resolve();
    };
    const failed = () => {
      cleanup();
      reject(new Error("動画をブラウザで読み込めませんでした。"));
    };
    video.addEventListener(event, ready, { once: true });
    video.addEventListener("error", failed, { once: true });
  });
}

export async function createAutomaticVideoThumbnail(file: File): Promise<File> {
  const objectUrl = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.preload = "metadata";

  try {
    const metadata = waitForVideoEvent(video, "loadedmetadata");
    video.src = objectUrl;
    video.load();
    await metadata;

    if (!video.videoWidth || !video.videoHeight)
      throw new Error("動画の画面サイズを取得できませんでした。");
    const captureTime = automaticThumbnailCaptureTime(video.duration);
    if (captureTime > 0) {
      const seeked = waitForVideoEvent(video, "seeked");
      video.currentTime = captureTime;
      await seeked;
    } else if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      await waitForVideoEvent(video, "loadeddata");
    }

    const canvas = document.createElement("canvas");
    canvas.width = AUTO_THUMBNAIL_WIDTH;
    canvas.height = AUTO_THUMBNAIL_HEIGHT;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("サムネイルを生成できませんでした。");
    const rect = coverDrawRect(
      video.videoWidth,
      video.videoHeight,
      AUTO_THUMBNAIL_WIDTH,
      AUTO_THUMBNAIL_HEIGHT
    );
    context.drawImage(video, rect.x, rect.y, rect.width, rect.height);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", AUTO_THUMBNAIL_QUALITY)
    );
    if (!blob) throw new Error("サムネイルをJPEGに変換できませんでした。");
    const baseName = file.name.replace(/\.[^.]+$/, "") || "video";
    return new File([blob], `${baseName}-thumbnail.jpg`, { type: "image/jpeg" });
  } finally {
    video.pause();
    video.removeAttribute("src");
    video.load();
    URL.revokeObjectURL(objectUrl);
  }
}
