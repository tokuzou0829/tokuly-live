"use client";
import React, { useEffect, useState, useRef } from "react";
import io, { Socket } from "socket.io-client";
import { type Session } from "next-auth";
import { Crown, Send } from "lucide-react";
import { AvatarGroup } from "@/components/ui/avatarGroup";
import { ChatItemView } from "@/components/chat-item";
import { ChatComposerAvatar } from "@/components/chat-composer-avatar";
import { useAtom } from "jotai";
import { WatchWinFriendRooomId, IsPartyHost, VideoPlayerRef } from "@/atoms/watchWithFriendAtom";

interface ChatProps {
  id: number;
  session: Session | null;
}

// Define the type for a chat message
type ChatMessage = {
  id: number | null;
  image: string;
  name: string;
  text: string;
};

type User = {
  id: string;
  image: string;
  name: string;
  role: "user" | "admin";
};

export default function Chat(props: ChatProps) {
  const { id, session } = props;
  const [socket, setSocket] = useState<Socket | null>(null); // Type the socket
  const [msg, setMsg] = useState("");
  const [is_connection, setIs_connection] = useState<boolean>(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]); // Use the ChatMessage type
  const [urlName, setUrlName] = useState<string | null | undefined>(null);
  const [WFRoomID] = useAtom<string | null>(WatchWinFriendRooomId);
  const [Users, setUsers] = useState<User[]>([]);
  const [isHost, setIsHost] = useAtom<boolean>(IsPartyHost);
  const [me, setMe] = useState<User | null>(null);
  const VideoTimeInterval = useRef<NodeJS.Timeout>();
  const [VideoRef] = useAtom<HTMLVideoElement | null>(VideoPlayerRef);
  const hasMessage = msg.trim().length > 0;

  useEffect(() => {
    let me_data: User;
    console.log("WFRoomID:", WFRoomID);
    const socket = io("https://live-data.tokuly.com", {
      path: "/wwf/socket.io/",
    });
    setSocket(socket);
    async function connectChat() {
      const roomId = WFRoomID;
      console.log(roomId);
      if (session?.user) {
        socket.on("connect", () => {
          setUrlName(session?.user?.name);
          socket.emit("join", {
            roomId: roomId,
            name: session?.user?.name,
            image: session?.user?.image,
          });
          setIs_connection(true);
        });
      } else {
        setUrlName("guest");
        socket.on("connect", () => {
          socket.emit("join", { roomId: roomId, name: "guest", image: "guest" });
          setIs_connection(true);
        });
      }
      socket.on("message", (msg) => {
        setMessages((prevMessages) => [msg, ...prevMessages]);
      });
      socket.on("me", (user) => {
        setMe(user);
        me_data = user;
        if (user.role === "admin") {
          setIsHost(true);
        } else {
          setIsHost(false);
        }
      });
      socket.on("userList", (userList) => {
        setUsers(userList);
      });
      socket.on("join", (user) => {
        setUsers((prevUsers) => {
          if (prevUsers.some((u) => u.id === user.id)) {
            return prevUsers;
          }
          return [user, ...prevUsers];
        });
      });
      socket.on("roleChange", (user) => {
        if (user.role == "admin" && user.id == me_data?.id) {
          setIsHost(true);
        } else {
          setIsHost(false);
        }
        setUsers((prevUsers) =>
          prevUsers.map((u) => (u.id === user.id ? { ...u, role: user.role } : u))
        );
      });
      socket.on("leave", (user) => {
        setUsers((prevUsers) => prevUsers.filter((u) => u.id !== user.id));
      });
    }
    connectChat();

    return () => {
      socket.disconnect();
    };
  }, [WFRoomID]);

  useEffect(() => {
    if (VideoRef && isHost) {
      VideoRef.addEventListener("play", () => {
        socket?.emit("play");
      });
      VideoRef.addEventListener("pause", () => {
        socket?.emit("pause");
      });
      VideoRef.addEventListener("seeked", () => {
        socket?.emit("video_time", { time: VideoRef.currentTime, playing: !VideoRef.paused });
      });
      VideoTimeInterval.current = setInterval(() => {
        socket?.emit("video_time", { time: VideoRef.currentTime, playing: !VideoRef.paused });
      }, 1000);
      return () => {
        if (VideoTimeInterval.current) {
          clearInterval(VideoTimeInterval.current);
        }
      };
    } else {
      if (VideoTimeInterval.current) {
        clearInterval(VideoTimeInterval.current);
      }
    }
  }, [VideoRef, isHost, socket]);

  useEffect(() => {
    if (VideoRef && !isHost) {
      socket?.on("play", () => {
        VideoRef.play();
      });
      socket?.on("pause", () => {
        VideoRef.pause();
      });
      socket?.on("video_time", (time) => {
        if (Math.abs(VideoRef.currentTime - time.time) > 1.5) {
          VideoRef.currentTime = time.time;
        }
        if (time.playing) {
          VideoRef.play();
        }
      });
      return () => {
        socket?.off("play");
        socket?.off("pause");
        socket?.off("video_time");
      };
    }
  }, [VideoRef, isHost, socket]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    if (socket) {
      e.preventDefault();

      if (msg === "") {
        return;
      }

      socket.emit("post", { text: msg });

      setMsg("");
    }
  };

  return (
    <section className="chat-body mb-[10px] h-[600px] w-full">
      <div className="chat-label chat-party-label">
        <p>一緒に観る</p>
        <div className="flex items-center">
          <AvatarGroup avatarDataList={Users} max={4} />
          <div className="ml-auto flex items-center rounded-full border px-[10px] py-[3px]">
            <Crown className="mr-[5px]" color="gold" />
            <img
              alt="ホスト"
              className="h-[30px] w-[30px] rounded-full object-cover"
              src={Users.find((user) => user.role === "admin")?.image ?? ""}
            />
          </div>
        </div>
      </div>
      <div className="chat-message-box">
        {messages.map((message, index) => (
          <ChatItemView
            key={message.id ?? `${message.name}-${index}`}
            item={{ ...message, type: "chat" }}
          />
        ))}
        {is_connection && (
          <>
            {!session?.user && (
              <p className="chat-status" role="status">
                ゲストとして参加中
              </p>
            )}
            <p className="chat-status" role="status" aria-live="polite">
              パーティーに接続しました
            </p>
          </>
        )}
      </div>
      <form onSubmit={handleSubmit} className="chat-input">
        <div className="chat-input-row">
          <ChatComposerAvatar image={session?.user?.image} name={session?.user?.name ?? urlName} />
          <input
            type="text"
            id="msg"
            aria-label="パーティーメッセージ"
            autoComplete="off"
            placeholder="チャット"
            value={msg}
            onChange={(e) => setMsg(e.target.value)}
            className="chat-input-field"
          />
          {hasMessage && (
            <button
              type="submit"
              aria-label="パーティーメッセージを送信"
              className="chat-send-button"
            >
              <Send aria-hidden="true" size={20} />
            </button>
          )}
        </div>
      </form>
    </section>
  );
}
