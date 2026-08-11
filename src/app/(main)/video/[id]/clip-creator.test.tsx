import React, { useEffect } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Live } from "@/types/live";
import { ArchivePlaybackProvider, useArchivePlayback } from "./archive-playback-context";
import ClipCreator, { resolveClipEditorMode } from "./clip-creator";
import { signIn, useSession } from "next-auth/react";
import { getOwnedChannels } from "@/requests/owned-channels";

const mocks = vi.hoisted(() => ({
  createStudioClip: vi.fn(),
  createStudioChannel: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("next-auth/react", () => ({
  signIn: vi.fn(),
  useSession: vi.fn(),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: mocks.refresh }) }));
vi.mock("@/requests/studio", () => ({
  createStudioClip: mocks.createStudioClip,
  createStudioChannel: mocks.createStudioChannel,
  StudioApiError: class StudioApiError extends Error {
    status = 422;
    fields = {};
  },
}));
vi.mock("@/requests/owned-channels", () => ({
  getOwnedChannels: vi.fn(),
}));

const live = {
  id: 34,
  title: "元動画",
  status: "video",
  stream_name: "video-key",
  thumbnail_url: "https://example.test/live.jpg",
  static_thumbnail_url: "https://example.test/poster.jpg",
  stream_overview: "",
  archive: true,
  stream_start_time: "2026-08-01T00:00:00Z",
  publishing_setting: "public",
  gifts_enabled: false,
  ch_name: "配信者",
  ch_icon: "https://example.test/channel.jpg",
  ch_handle: "owner",
  subtitles: [],
  duration_seconds: 120,
} satisfies Live;

function PlaybackSetup({
  children,
  durationSeconds,
}: {
  children: React.ReactNode;
  durationSeconds: number;
}) {
  const { setCurrentTime, setDuration, registerController } = useArchivePlayback();
  useEffect(() => {
    setCurrentTime(10);
    setDuration(durationSeconds);
    registerController({ seekTo: vi.fn(), play: vi.fn(), pause: vi.fn() });
    return () => registerController(null);
  }, [durationSeconds, registerController, setCurrentTime, setDuration]);
  return (
    <>
      {children}
      <button data-testid="set-playback-start" hidden onClick={() => setCurrentTime(0)} />
      <button data-testid="set-playback-end" hidden onClick={() => setCurrentTime(120)} />
      <button data-testid="set-playback-outside" hidden onClick={() => setCurrentTime(121)} />
    </>
  );
}

function renderCreator(source = live) {
  return render(
    <>
      <div id="clip-mobile-stage">
        <div id="clip-mobile-player" />
        <div id="clip-mobile-editor-slot" />
      </div>
      <div id="clip-editor-slot" />
      <ArchivePlaybackProvider>
        <PlaybackSetup durationSeconds={source.duration_seconds ?? 0}>
          <ClipCreator live={source} />
        </PlaybackSetup>
      </ArchivePlaybackProvider>
    </>
  );
}

describe("ClipCreator", () => {
  beforeEach(() => {
    vi.stubGlobal("PointerEvent", MouseEvent);
    vi.stubGlobal(
      "ResizeObserver",
      class ResizeObserver {
        observe() {}
        unobserve() {}
        disconnect() {}
      }
    );
    Object.defineProperty(HTMLElement.prototype, "setPointerCapture", {
      configurable: true,
      value: vi.fn(),
    });
    Object.defineProperty(HTMLElement.prototype, "releasePointerCapture", {
      configurable: true,
      value: vi.fn(),
    });
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      writable: true,
      value: 1024,
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it("shows a login action for signed-out viewers", () => {
    vi.mocked(useSession).mockReturnValue({
      data: null,
      status: "unauthenticated",
      update: vi.fn(),
    });
    renderCreator();
    fireEvent.click(screen.getByRole("button", { name: "クリップ" }));
    fireEvent.click(screen.getByRole("button", { name: "ログイン" }));
    expect(signIn).toHaveBeenCalledWith("tokuly");
  });

  it("opens channel selection even when exactly one channel is owned", async () => {
    vi.mocked(getOwnedChannels).mockResolvedValue([
      {
        id: 7,
        name: "選択するチャンネル",
        handle: "select-channel",
        profile_photo_url: "https://example.test/channel.jpg",
      },
    ]);
    vi.mocked(useSession).mockReturnValue({
      status: "authenticated",
      update: vi.fn(),
      data: {
        expires: "2099-01-01T00:00:00Z",
        user: { id: "1", name: "User", access_token: "token" },
        activePostingIdentity: {
          type: "user",
          accountId: "1",
          name: "User",
          handle: "user",
          profilePhotoUrl: "",
        },
      },
    });
    renderCreator();
    fireEvent.click(screen.getByRole("button", { name: "クリップ" }));
    expect(
      await screen.findByRole("heading", { name: "投稿チャンネルを選択" })
    ).toBeInTheDocument();
    expect(screen.getByText("選択するチャンネル")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "クリップを作成" })).not.toBeInTheDocument();
  });

  it("selects an owned channel and opens the clip editor", async () => {
    const channels = [
      {
        id: 7,
        name: "Channel A",
        handle: "channel-a",
        profile_photo_url: "https://example.test/a.jpg",
      },
      {
        id: 8,
        name: "Channel B",
        handle: "channel-b",
        profile_photo_url: "https://example.test/b.jpg",
      },
    ];
    const update = vi.fn().mockResolvedValue({
      activePostingIdentity: {
        type: "channel",
        channelId: 7,
      },
    });
    vi.mocked(getOwnedChannels).mockResolvedValue(channels);
    vi.mocked(useSession).mockReturnValue({
      status: "authenticated",
      update,
      data: {
        expires: "2099-01-01T00:00:00Z",
        user: { id: "1", name: "User", access_token: "token" },
        activePostingIdentity: {
          type: "user",
          accountId: "1",
          name: "User",
          handle: "user",
          profilePhotoUrl: "",
        },
      },
    });

    renderCreator();
    fireEvent.click(screen.getByRole("button", { name: "クリップ" }));
    fireEvent.click(await screen.findByRole("button", { name: /Channel A/ }));

    await waitFor(() => expect(update).toHaveBeenCalledWith({ activeChannelId: 7 }));
    expect(await screen.findByRole("heading", { name: "クリップを作成" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "投稿チャンネルを選択" })).not.toBeInTheDocument();
  });

  it("opens channel creation when no channel is owned and resumes editing after creation", async () => {
    const update = vi.fn().mockResolvedValue({
      activePostingIdentity: {
        type: "channel",
        channelId: 21,
      },
    });
    vi.mocked(getOwnedChannels).mockResolvedValue([]);
    mocks.createStudioChannel.mockResolvedValue({
      id: 21,
      name: "New Channel",
      handle: "new-channel",
      icon_url: null,
    });
    vi.mocked(useSession).mockReturnValue({
      status: "authenticated",
      update,
      data: {
        expires: "2099-01-01T00:00:00Z",
        user: { id: "1", name: "User", access_token: "token" },
        activePostingIdentity: {
          type: "user",
          accountId: "1",
          name: "User",
          handle: "user",
          profilePhotoUrl: "",
        },
      },
    });

    renderCreator();
    fireEvent.click(screen.getByRole("button", { name: "クリップ" }));
    expect(
      await screen.findByRole("heading", { name: "新しいチャンネルを作成" })
    ).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("チャンネル名"), {
      target: { value: "New Channel" },
    });
    fireEvent.change(screen.getByLabelText("ハンドル"), {
      target: { value: "new-channel" },
    });
    fireEvent.click(screen.getByRole("button", { name: "チャンネルを作成" }));

    await waitFor(() => expect(update).toHaveBeenCalledWith({ activeChannelId: 21 }));
    expect(await screen.findByRole("heading", { name: "クリップを作成" })).toBeInTheDocument();
  });

  it("shows a retry action when owned channels cannot be loaded", async () => {
    vi.mocked(getOwnedChannels).mockRejectedValueOnce(new Error("一覧の取得に失敗しました。"));
    vi.mocked(useSession).mockReturnValue({
      status: "authenticated",
      update: vi.fn(),
      data: {
        expires: "2099-01-01T00:00:00Z",
        user: { id: "1", name: "User", access_token: "token" },
        activePostingIdentity: {
          type: "user",
          accountId: "1",
          name: "User",
          handle: "user",
          profilePhotoUrl: "",
        },
      },
    });

    renderCreator();
    fireEvent.click(screen.getByRole("button", { name: "クリップ" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("一覧の取得に失敗しました。");

    vi.mocked(getOwnedChannels).mockResolvedValueOnce([
      { id: 9, name: "Retry Channel", handle: "retry", profile_photo_url: "" },
    ]);
    fireEvent.click(screen.getByRole("button", { name: "再試行" }));
    expect(await screen.findByText("Retry Channel")).toBeInTheDocument();
  });

  it("submits the API payload and shows the created clip", async () => {
    mocks.createStudioClip.mockResolvedValue({
      clip_key: "clip-key",
      creator_channel_id: 12,
      source_video_id: 34,
      title: "見どころ",
      start_seconds: 22.1,
      end_seconds: 82.1,
      duration_seconds: 60,
      thumbnail_url: "https://example.test/clip.jpg",
      creator_channel: {
        id: 12,
        name: "投稿チャンネル",
        handle: "my-channel",
        icon_url: "https://example.test/me.jpg",
      },
      source_video: {
        id: 34,
        title: "元動画",
        stream_key: "video-key",
        type: "video",
        thumbnail_url: "https://example.test/poster.jpg",
      },
      source_channel: { id: 9, name: "配信者", handle: "owner", icon_url: null },
      created_at: "2026-08-11T12:00:00+09:00",
    });
    vi.mocked(useSession).mockReturnValue({
      status: "authenticated",
      update: vi.fn(),
      data: {
        expires: "2099-01-01T00:00:00Z",
        user: { id: "1", name: "User", access_token: "token" },
        activePostingIdentity: {
          type: "channel",
          accountId: "1",
          channelId: 12,
          name: "投稿チャンネル",
          handle: "my-channel",
          profilePhotoUrl: "https://example.test/me.jpg",
        },
      },
    });
    renderCreator();
    fireEvent.click(screen.getByRole("button", { name: "クリップ" }));
    expect(getOwnedChannels).not.toHaveBeenCalled();
    expect(screen.queryByLabelText("タイトル")).not.toBeInTheDocument();
    expect(screen.queryByText("@my-channel")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("開始")).not.toBeInTheDocument();
    expect(screen.queryByText("最大 60.0秒")).not.toBeInTheDocument();
    const rangeMover = screen.getByRole("button", { name: "選択範囲を移動" });
    const startHandle = screen.getByRole("slider", { name: "開始位置" });
    const endHandle = screen.getByRole("slider", { name: "終了位置" });
    expect(startHandle).toHaveClass("w-0", "z-40");
    expect(endHandle).toHaveClass("w-0", "z-40");
    expect(startHandle.firstElementChild).toHaveClass("w-7", "-translate-x-1/2");
    expect(endHandle.firstElementChild).toHaveClass("w-7", "-translate-x-1/2");
    expect(rangeMover.style.left).toContain("14px");
    expect(rangeMover.style.width).toContain("28px");
    Object.defineProperty(rangeMover.parentElement, "getBoundingClientRect", {
      configurable: true,
      value: () => ({ width: 400 }),
    });
    fireEvent.pointerDown(rangeMover, { clientX: 100, pointerId: 1 });
    fireEvent.pointerMove(rangeMover, { clientX: 140, pointerId: 1 });
    fireEvent.pointerUp(rangeMover, { clientX: 140, pointerId: 1 });
    fireEvent.keyDown(screen.getByRole("button", { name: "選択範囲を移動" }), {
      key: "ArrowRight",
    });
    fireEvent.click(screen.getByRole("button", { name: "詳細" }));
    expect(screen.getByLabelText("開始")).toBeInTheDocument();
    expect(screen.getByLabelText("終了")).toBeInTheDocument();
    expect(screen.getByLabelText("開始")).toHaveValue("00:22.1");
    expect(screen.getByLabelText("終了")).toHaveValue("01:22.1");
    fireEvent.click(screen.getByRole("button", { name: "続ける" }));
    expect(screen.getByText("@my-channel")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("タイトル"), { target: { value: "見どころ" } });
    fireEvent.click(screen.getByRole("button", { name: "クリップを作成" }));

    await waitFor(() => expect(screen.getByText("クリップを作成しました")).toBeInTheDocument());
    expect(mocks.createStudioClip).toHaveBeenCalledWith(
      12,
      {
        title: "見どころ",
        source_video_id: 34,
        start_seconds: 22.1,
        end_seconds: 82.1,
      },
      "token"
    );
    expect(screen.getByText("見どころ")).toBeInTheDocument();
    expect(screen.getByText("投稿チャンネル")).toBeInTheDocument();
    expect(screen.getByText("60.0秒")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /クリップを見る/ })).toHaveAttribute(
      "href",
      "/clip/clip-key"
    );
    expect(mocks.refresh).toHaveBeenCalled();
  });

  it("renders a zoomable long-video editor in the desktop side-column slot", () => {
    window.innerWidth = 1400;
    vi.mocked(useSession).mockReturnValue({
      status: "authenticated",
      update: vi.fn(),
      data: {
        expires: "2099-01-01T00:00:00Z",
        user: { id: "1", name: "User" },
        activePostingIdentity: {
          type: "channel",
          accountId: "1",
          channelId: 12,
          name: "投稿チャンネル",
          handle: "my-channel",
          profilePhotoUrl: "https://example.test/me.jpg",
        },
      },
    });
    renderCreator({ ...live, duration_seconds: 10 * 60 * 60 });
    fireEvent.click(screen.getByRole("button", { name: "クリップ" }));

    expect(screen.getAllByText("10:00:00.0").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole("button", { name: "1分" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "2分" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "5分" })).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(document.getElementById("clip-editor-slot")).toHaveTextContent("クリップを作成");
  });

  it("shows the current playback position on the detail timeline and follows updates", () => {
    vi.mocked(useSession).mockReturnValue({
      status: "authenticated",
      update: vi.fn(),
      data: {
        expires: "2099-01-01T00:00:00Z",
        user: { id: "1", name: "User" },
        activePostingIdentity: {
          type: "channel",
          accountId: "1",
          channelId: 12,
          name: "投稿チャンネル",
          handle: "my-channel",
          profilePhotoUrl: "",
        },
      },
    });
    renderCreator();
    fireEvent.click(screen.getByRole("button", { name: "クリップ" }));

    expect(screen.getByTestId("clip-playhead")).toHaveStyle({ left: `${(10 / 120) * 100}%` });

    fireEvent.click(screen.getByTestId("set-playback-start"));
    expect(screen.getByTestId("clip-playhead")).toHaveStyle({ left: "0%" });

    fireEvent.click(screen.getByTestId("set-playback-end"));
    expect(screen.getByTestId("clip-playhead")).toHaveStyle({ left: "100%" });

    fireEvent.click(screen.getByTestId("set-playback-outside"));
    expect(screen.queryByTestId("clip-playhead")).not.toBeInTheDocument();
  });

  it("keeps the anchored editor open until its close button is used", () => {
    vi.mocked(useSession).mockReturnValue({
      data: null,
      status: "unauthenticated",
      update: vi.fn(),
    });
    renderCreator();
    fireEvent.click(screen.getByRole("button", { name: "クリップ" }));

    const heading = screen.getByRole("heading", { name: "クリップを作成" });
    fireEvent.keyDown(heading, { key: "Escape" });
    fireEvent.pointerDown(document.body);
    expect(screen.getByRole("heading", { name: "クリップを作成" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "クリップ編集を閉じる" }));
    expect(screen.queryByRole("heading", { name: "クリップを作成" })).not.toBeInTheDocument();
  });

  it("uses a scroll-locked split workspace on mobile and restores it on close", () => {
    window.innerWidth = 375;
    vi.mocked(useSession).mockReturnValue({
      data: null,
      status: "unauthenticated",
      update: vi.fn(),
    });
    renderCreator();
    fireEvent.click(screen.getByRole("button", { name: "クリップ" }));

    const stage = document.getElementById("clip-mobile-stage");
    expect(stage).toHaveAttribute("data-clip-open", "true");
    expect(document.getElementById("clip-mobile-editor-slot")).toHaveTextContent("クリップを作成");
    expect(document.body.style.overflow).toBe("hidden");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "クリップ編集を閉じる" }));
    expect(stage).not.toHaveAttribute("data-clip-open");
    expect(document.body.style.overflow).toBe("");
  });

  it("preserves the editor step and title while crossing a breakpoint", () => {
    vi.mocked(useSession).mockReturnValue({
      status: "authenticated",
      update: vi.fn(),
      data: {
        expires: "2099-01-01T00:00:00Z",
        user: { id: "1", name: "User" },
        activePostingIdentity: {
          type: "channel",
          accountId: "1",
          channelId: 12,
          name: "投稿チャンネル",
          handle: "my-channel",
          profilePhotoUrl: "",
        },
      },
    });
    renderCreator();
    fireEvent.click(screen.getByRole("button", { name: "クリップ" }));
    fireEvent.click(screen.getByRole("button", { name: "続ける" }));
    fireEvent.change(screen.getByLabelText("タイトル"), { target: { value: "保持するタイトル" } });

    window.innerWidth = 1400;
    fireEvent(window, new Event("resize"));

    expect(screen.getByLabelText("タイトル")).toHaveValue("保持するタイトル");
    expect(document.getElementById("clip-editor-slot")).toHaveTextContent("2/2");
  });
});

describe("resolveClipEditorMode", () => {
  it.each([
    [375, "mobile"],
    [639, "mobile"],
    [640, "anchored"],
    [1279, "anchored"],
    [1280, "sidebar"],
  ] as const)("maps %ipx to %s", (width, expected) => {
    expect(resolveClipEditorMode(width)).toBe(expected);
  });
});
