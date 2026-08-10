import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { uploadVideoChunks } from "@/lib/studio-upload";
import { createAutomaticVideoThumbnail } from "@/lib/studio-video-thumbnail";
import { createStudioStream, getUploadSession } from "@/requests/studio";
import VideoUploadWizard from "./video-upload-wizard";

const navigation = vi.hoisted(() => ({ replace: vi.fn() }));

vi.mock("next/navigation", () => ({ useRouter: () => navigation }));
vi.mock("@/lib/studio-upload", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/studio-upload")>();
  return { ...actual, uploadVideoChunks: vi.fn() };
});
vi.mock("@/lib/studio-video-thumbnail", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/studio-video-thumbnail")>();
  return { ...actual, createAutomaticVideoThumbnail: vi.fn() };
});
vi.mock("@/requests/studio", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/requests/studio")>();
  return { ...actual, createStudioStream: vi.fn(), getUploadSession: vi.fn() };
});

const stream = { id: 81, channel_id: 7, type: "video", title: "新しい動画" } as never;
const session = { session_id: "studio-session", state: "waiting" } as never;

function selectedVideo() {
  return new File(["video"], "recording.unusual", { type: "" });
}

describe("Studio video upload wizard", () => {
  beforeEach(() => {
    navigation.replace.mockReset();
    vi.stubGlobal("URL", {
      ...URL,
      createObjectURL: vi.fn(() => "blob:thumbnail"),
      revokeObjectURL: vi.fn(),
    });
    vi.mocked(createAutomaticVideoThumbnail).mockResolvedValue(
      new File(["thumbnail"], "automatic.jpg", { type: "image/jpeg" })
    );
    vi.mocked(createStudioStream).mockResolvedValue(stream);
    vi.mocked(getUploadSession).mockResolvedValue(session);
    vi.mocked(uploadVideoChunks).mockResolvedValue();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("accepts a dropped file without client format checks and keeps it when going back", async () => {
    render(<VideoUploadWizard channelId={7} token="token" />);
    const dropzone = screen.getByText("動画ファイルをドラッグ＆ドロップ").closest("label")!;
    fireEvent.drop(dropzone, { dataTransfer: { files: [selectedVideo()] } });

    const title = await screen.findByLabelText("タイトル");
    fireEvent.change(title, { target: { value: "保持されるタイトル" } });
    fireEvent.click(screen.getByRole("button", { name: "戻る" }));

    expect(screen.getByText("recording.unusual")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "この動画で続ける" }));
    expect(screen.getByLabelText("タイトル")).toHaveValue("保持されるタイトル");
  });

  it("creates the frame, reports upload phases, and navigates after transfer", async () => {
    const { container } = render(<VideoUploadWizard channelId={7} token="token" />);
    const picker = container.querySelector('input[type="file"][accept="video/*"]')!;
    fireEvent.change(picker, { target: { files: [selectedVideo()] } });
    fireEvent.change(await screen.findByLabelText("タイトル"), {
      target: { value: "新しい動画" },
    });
    await screen.findByAltText("サムネイルプレビュー");
    fireEvent.change(screen.getByLabelText("サムネイル（任意）"), {
      target: {
        files: [new File(["manual"], "manual.png", { type: "image/png" })],
      },
    });
    vi.mocked(uploadVideoChunks).mockImplementation(async (_file, _session, options) => {
      options?.onPhase?.("hashing");
      options?.onPhase?.("preparing");
      options?.onPhase?.("uploading");
      options?.onProgress?.(100);
    });

    fireEvent.click(screen.getByRole("button", { name: "続ける" }));

    await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith("/studio/videos/81"));
    expect(createStudioStream).toHaveBeenCalledWith(
      7,
      expect.objectContaining({
        type: "video",
        title: "新しい動画",
        thumbnail: expect.objectContaining({ name: "manual.png" }),
      }),
      "token"
    );
    expect(getUploadSession).toHaveBeenCalledWith(81, "token");
    expect(vi.mocked(createStudioStream).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(getUploadSession).mock.invocationCallOrder[0]
    );
    expect(vi.mocked(getUploadSession).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(uploadVideoChunks).mock.invocationCallOrder[0]
    );
  });

  it("retries the existing frame after the server rejects an upload", async () => {
    vi.mocked(uploadVideoChunks)
      .mockRejectedValueOnce(new Error("サーバーがこのファイルを拒否しました。"))
      .mockResolvedValueOnce();
    const { container } = render(<VideoUploadWizard channelId={7} token="token" />);
    fireEvent.change(container.querySelector('input[type="file"]')!, {
      target: { files: [selectedVideo()] },
    });
    fireEvent.change(await screen.findByLabelText("タイトル"), { target: { value: "再試行" } });
    await screen.findByAltText("サムネイルプレビュー");
    fireEvent.click(screen.getByRole("button", { name: "続ける" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "サーバーがこのファイルを拒否しました。"
    );
    fireEvent.click(screen.getByRole("button", { name: "もう一度試す" }));

    await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith("/studio/videos/81"));
    expect(createStudioStream).toHaveBeenCalledTimes(1);
    expect(getUploadSession).toHaveBeenCalledTimes(1);
    expect(uploadVideoChunks).toHaveBeenCalledTimes(2);
  });

  it("continues without a thumbnail when automatic generation fails", async () => {
    vi.mocked(createAutomaticVideoThumbnail).mockRejectedValueOnce(new Error("decode failed"));
    const { container } = render(<VideoUploadWizard channelId={7} token="token" />);
    fireEvent.change(container.querySelector('input[type="file"]')!, {
      target: { files: [selectedVideo()] },
    });
    fireEvent.change(await screen.findByLabelText("タイトル"), {
      target: { value: "サムネイルなし" },
    });
    await screen.findByText(/サムネイルを自動生成できませんでした/);

    fireEvent.click(screen.getByRole("button", { name: "続ける" }));

    await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith("/studio/videos/81"));
    expect(createStudioStream).toHaveBeenCalledWith(
      7,
      { type: "video", title: "サムネイルなし" },
      "token"
    );
  });
});
