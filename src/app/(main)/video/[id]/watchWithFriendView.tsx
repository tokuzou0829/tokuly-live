"use client";
import { useAtom } from "jotai";
import { IsWatchWithFriend } from "@/atoms/watchWithFriendAtom";
import WatchWithFriend from "./watchWithFriend";

export default function WatchWithFriendView(props: { id: number; session: any }) {
  const { id, session } = props;
  const [isWatchWithFriend] = useAtom(IsWatchWithFriend);
  return isWatchWithFriend && <WatchWithFriend id={id} session={session}></WatchWithFriend>;
}
