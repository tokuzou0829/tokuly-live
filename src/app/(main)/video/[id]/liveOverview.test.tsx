import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createStore, Provider } from "jotai";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Live } from "@/types/live";
import {
  IsPartyHost,
  IsWatchWithFriend,
  WatchPartyConnectionStatus,
  WatchWithFriendRoomId,
} from "@/atoms/watchWithFriendAtom";
import LiveOverview from "./liveOverview";

const live = {
  status: "video",
  stream_name: "archive-name",
  stream_overview: "概要",
  stream_start_time: "2026-08-10T00:00:00.000Z",
} as Live;

describe("watch party creation", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    window.history.replaceState({}, "", "/");
  });

  it("creates a UUID room, resets host state, and writes it to the current URL", () => {
    const roomId = "019feb64-8f57-7862-8b1a-60273afcf78e";
    vi.spyOn(globalThis.crypto, "randomUUID").mockReturnValue(roomId);
    const store = createStore();
    store.set(IsPartyHost, true);

    render(
      <Provider store={store}>
        <LiveOverview live={live} />
      </Provider>
    );
    fireEvent.click(screen.getByRole("button", { name: "この動画をみんなで観る" }));

    expect(store.get(IsWatchWithFriend)).toBe(true);
    expect(store.get(IsPartyHost)).toBe(false);
    expect(store.get(WatchWithFriendRoomId)).toBe(roomId);
    expect(store.get(WatchPartyConnectionStatus)).toBe("connecting");
    expect(new URL(window.location.href).searchParams.get("room_id")).toBe(roomId);
  });
});
