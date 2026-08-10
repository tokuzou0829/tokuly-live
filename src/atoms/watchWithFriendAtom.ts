import { atom } from "jotai";

export const IsWatchWithFriend = atom<boolean>(false);
export const IsPartyHost = atom<boolean>(false);
export const WatchWithFriendRoomId = atom<string | null>(null);
export const VideoPlayerRef = atom<HTMLVideoElement | null>(null);
export const WatchPartyConnectionStatus = atom<
  "idle" | "connecting" | "connected" | "reconnecting" | "error"
>("idle");
