import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Session } from "next-auth";
import AccountDropdownMenu from "./menu";
import { getOwnedChannels } from "@/requests/owned-channels";

const update = vi.fn();
const refresh = vi.fn();

function mockNarrowViewport(matches: boolean) {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: vi.fn().mockImplementation(() => ({
      matches,
      media: "(max-width: 639px)",
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

const session = {
  expires: "2099-01-01",
  user: {
    id: "1",
    name: "User",
    handle: "user",
    image: "https://example.test/user.jpg",
    access_token: "token",
  },
  activePostingIdentity: {
    type: "user",
    accountId: "1",
    name: "User",
    handle: "user",
    profilePhotoUrl: "https://example.test/user.jpg",
  },
} as Session;

vi.mock("next-auth/react", () => ({
  useSession: () => ({ data: session, update }),
  signIn: vi.fn(),
  signOut: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  usePathname: () => "/live/1",
  useRouter: () => ({ refresh }),
}));
vi.mock("@/requests/owned-channels", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/requests/owned-channels")>();
  return { ...original, getOwnedChannels: vi.fn() };
});

describe("account dropdown menu", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNarrowViewport(false);
    vi.stubGlobal("PointerEvent", MouseEvent);
    Object.defineProperty(HTMLElement.prototype, "hasPointerCapture", {
      configurable: true,
      value: vi.fn(() => false),
    });
    Object.defineProperty(HTMLElement.prototype, "setPointerCapture", {
      configurable: true,
      value: vi.fn(),
    });
    vi.mocked(getOwnedChannels).mockResolvedValue([
      {
        id: 7,
        name: "Channel",
        handle: "channel",
        profile_photo_url: "https://example.test/channel.jpg",
      },
    ]);
  });

  afterEach(cleanup);

  it("loads and groups channels only after the switcher is opened", async () => {
    render(<AccountDropdownMenu />);
    expect(getOwnedChannels).not.toHaveBeenCalled();

    fireEvent.pointerDown(screen.getByRole("button", { name: "Userのアカウントメニュー" }), {
      button: 0,
      ctrlKey: false,
    });
    const switcher = await screen.findByText("アカウントを切り替え");
    expect(getOwnedChannels).not.toHaveBeenCalled();

    fireEvent.pointerMove(switcher);
    fireEvent.focus(switcher);
    fireEvent.keyDown(switcher, { key: "ArrowRight", code: "ArrowRight" });

    await waitFor(() => expect(getOwnedChannels).toHaveBeenCalledWith("token"));
    expect(await screen.findByText("Tokulyアカウント")).toBeInTheDocument();
    expect(await screen.findByText("あなたのチャンネル")).toBeInTheDocument();
    expect(await screen.findByText("Channel")).toBeInTheDocument();
    expect(screen.getByText("@channel")).toBeInTheDocument();
  });

  it("expands account choices inside the main menu on narrow viewports", async () => {
    mockNarrowViewport(true);
    render(<AccountDropdownMenu />);

    fireEvent.pointerDown(screen.getByRole("button", { name: "Userのアカウントメニュー" }), {
      button: 0,
      ctrlKey: false,
    });
    const switcher = await screen.findByText("アカウントを切り替え");

    expect(screen.queryByTestId("mobile-identity-options")).not.toBeInTheDocument();
    fireEvent.focus(switcher);
    await waitFor(() => expect(getOwnedChannels).toHaveBeenCalledWith("token"));
    fireEvent.click(switcher);

    expect(await screen.findByTestId("mobile-identity-options")).toBeInTheDocument();
    expect(await screen.findByText("Channel")).toBeInTheDocument();
    expect(screen.getAllByRole("menu")).toHaveLength(1);
  });
});
