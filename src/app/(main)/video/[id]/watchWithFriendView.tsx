"use client";
import { useAtom } from "jotai";
import { IsWatchWithFriend, WatchWithFriendRoomId } from "@/atoms/watchWithFriendAtom";
import WatchWithFriend from "./watchWithFriend";
import { type Session } from "next-auth";

export default function WatchWithFriendView(props: { id: number; session: Session | null }) {
  const { id, session } = props;
  const [isWatchWithFriend] = useAtom(IsWatchWithFriend);
  const [roomId] = useAtom(WatchWithFriendRoomId);
  return isWatchWithFriend && roomId ? (
    <WatchWithFriend id={id} roomId={roomId} session={session} />
  ) : null;
}
