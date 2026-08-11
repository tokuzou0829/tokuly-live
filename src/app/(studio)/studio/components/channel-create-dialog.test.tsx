import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { activateStudioChannel } from "../actions";
import { createStudioChannel, StudioApiError } from "@/requests/studio";
import ChannelCreateDialog from "@/components/channel-create-dialog";

const navigation = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn() }));

async function finishCreating(channel: { id: number }) {
  const selected = await activateStudioChannel(channel.id);
  if (!selected) throw new Error("作成したチャンネルを選択できませんでした。");
  navigation.replace("/studio");
  navigation.refresh();
}

vi.mock("next/navigation", () => ({ useRouter: () => navigation }));
vi.mock("../actions", () => ({ activateStudioChannel: vi.fn() }));
vi.mock("@/requests/studio", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/requests/studio")>();
  return { ...actual, createStudioChannel: vi.fn() };
});

describe("Studio channel creation dialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("PointerEvent", MouseEvent);
    vi.stubGlobal("URL", {
      ...URL,
      createObjectURL: vi.fn(() => "blob:channel-icon"),
      revokeObjectURL: vi.fn(),
    });
    vi.mocked(createStudioChannel).mockResolvedValue({ id: 21 } as never);
    vi.mocked(activateStudioChannel).mockResolvedValue(true);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("previews an icon and creates and selects the channel", async () => {
    render(
      <ChannelCreateDialog
        token="token"
        defaultIconUrl="https://example.test/user.jpg"
        open
        onOpenChange={vi.fn()}
        onCreated={finishCreating}
      />
    );

    expect(screen.getByAltText("デフォルトのチャンネルアイコン")).toHaveAttribute(
      "src",
      "https://example.test/user.jpg"
    );
    const icon = new File(["image"], "icon.webp", { type: "image/webp" });

    fireEvent.change(screen.getByLabelText("アイコン（任意）"), { target: { files: [icon] } });
    expect(screen.getByAltText("チャンネルアイコンのプレビュー")).toHaveAttribute(
      "src",
      "blob:channel-icon"
    );
    fireEvent.click(screen.getByRole("button", { name: "選択を取り消す" }));
    expect(screen.getByAltText("デフォルトのチャンネルアイコン")).toHaveAttribute(
      "src",
      "https://example.test/user.jpg"
    );
    fireEvent.change(screen.getByLabelText("アイコン（任意）"), { target: { files: [icon] } });
    fireEvent.change(screen.getByLabelText("チャンネル名"), {
      target: { value: "New Channel" },
    });
    fireEvent.change(screen.getByLabelText("ハンドル"), {
      target: { value: "new-channel" },
    });
    fireEvent.click(screen.getByRole("button", { name: "チャンネルを作成" }));

    await waitFor(() => expect(activateStudioChannel).toHaveBeenCalledWith(21));
    expect(createStudioChannel).toHaveBeenCalledWith(
      { name: "New Channel", handle: "new-channel", icon },
      "token"
    );
    expect(navigation.replace).toHaveBeenCalledWith("/studio");
    expect(navigation.refresh).toHaveBeenCalled();
  });

  it("rejects unsupported and oversized icons before upload", () => {
    render(
      <ChannelCreateDialog
        token="token"
        defaultIconUrl="https://example.test/user.jpg"
        open
        onOpenChange={vi.fn()}
        onCreated={finishCreating}
      />
    );
    const unsupported = new File(["image"], "icon.gif", { type: "image/gif" });

    fireEvent.change(screen.getByLabelText("アイコン（任意）"), {
      target: { files: [unsupported] },
    });
    expect(
      screen.getByText("JPG、JPEG、PNG、WebP形式の画像を選択してください。")
    ).toBeInTheDocument();

    const oversized = new File(["image"], "icon.png", { type: "image/png" });
    Object.defineProperty(oversized, "size", { value: 10 * 1024 * 1024 + 1 });
    fireEvent.change(screen.getByLabelText("アイコン（任意）"), {
      target: { files: [oversized] },
    });
    expect(screen.getByText("アイコン画像は10MB以下にしてください。")).toBeInTheDocument();
    expect(screen.queryByAltText("チャンネルアイコンのプレビュー")).not.toBeInTheDocument();
  });

  it("shows API field errors only once and cannot be closed in blocking mode", async () => {
    vi.mocked(createStudioChannel).mockRejectedValue(
      new StudioApiError(422, "The given data was invalid.", {
        handle: ["The handle has already been taken."],
        icon: ["The icon must be an image."],
      })
    );
    render(
      <ChannelCreateDialog
        token="token"
        defaultIconUrl={null}
        open
        onOpenChange={vi.fn()}
        blocking
        onCreated={finishCreating}
      />
    );

    expect(screen.queryByRole("button", { name: "Close" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "キャンセル" })).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("チャンネル名"), { target: { value: "Channel" } });
    fireEvent.change(screen.getByLabelText("ハンドル"), { target: { value: "channel" } });
    fireEvent.click(screen.getByRole("button", { name: "チャンネルを作成" }));

    expect(await screen.findByText("The handle has already been taken.")).toBeInTheDocument();
    expect(screen.getByText("The icon must be an image.")).toBeInTheDocument();
    expect(screen.queryByText("The given data was invalid.")).not.toBeInTheDocument();
  });
});
