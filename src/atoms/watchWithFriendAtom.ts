import { atom } from "jotai";

export const IsWatchWithFriend = atom<boolean>(false);
export const IsPartyHost = atom<boolean>(false);
export const WatchWinFriendRooomId = atom<string | null>(null);
export const VideoPlayerRef = atom<HTMLVideoElement | null>(null);
