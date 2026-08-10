import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createStudioStream } from "@/requests/studio";
import CreateContentForm from "./create-content-form";

const navigation = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock("next/navigation", () => ({ useRouter: () => navigation }));
vi.mock("@/requests/studio", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/requests/studio")>();
  return { ...actual, createStudioStream: vi.fn() };
});

describe("Studio live creation form", () => {
  beforeEach(() => {
    navigation.push.mockReset();
    vi.stubGlobal("URL", {
      ...URL,
      createObjectURL: vi.fn(() => "blob:selected-thumbnail"),
      revokeObjectURL: vi.fn(),
    });
    vi.mocked(createStudioStream).mockResolvedValue({ id: 81 } as never);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("previews the selected thumbnail and clears it when selection is cancelled", () => {
    render(<CreateContentForm type="live" channelId={7} token="token" />);
    const thumbnail = new File(["thumbnail"], "live.png", { type: "image/png" });

    fireEvent.change(screen.getByLabelText("サムネイル（任意）"), {
      target: { files: [thumbnail] },
    });

    expect(screen.getByAltText("サムネイルプレビュー")).toHaveAttribute(
      "src",
      "blob:selected-thumbnail"
    );
    fireEvent.click(screen.getByRole("button", { name: "選択を取り消す" }));

    expect(screen.queryByAltText("サムネイルプレビュー")).not.toBeInTheDocument();
    expect(screen.getByText("サムネイルは設定されていません")).toBeInTheDocument();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:selected-thumbnail");
  });

  it("creates the live stream with the previewed thumbnail", async () => {
    render(<CreateContentForm type="live" channelId={7} token="token" />);
    const thumbnail = new File(["thumbnail"], "live.png", { type: "image/png" });
    fireEvent.change(screen.getByLabelText("タイトル"), { target: { value: "新しい配信" } });
    fireEvent.change(screen.getByLabelText("サムネイル（任意）"), {
      target: { files: [thumbnail] },
    });

    fireEvent.click(screen.getByRole("button", { name: "ライブ配信を作成" }));

    await waitFor(() => expect(navigation.push).toHaveBeenCalledWith("/studio/streams/81"));
    expect(createStudioStream).toHaveBeenCalledWith(
      7,
      { type: "live", title: "新しい配信", thumbnail },
      "token"
    );
  });
});
