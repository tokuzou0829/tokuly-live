"use client";
import React, { useEffect, useState, useRef } from 'react';
import io, { Socket } from 'socket.io-client';
import NextAuth, { type Session } from "next-auth";
import { Crown, Plane, Send } from 'lucide-react';
import { AvatarGroup } from '@/components/ui/avatarGroup';
import { useAtom } from "jotai";
import { WatchWinFriendRooomId, IsPartyHost, VideoPlayerRef } from "@/atoms/watchWithFriendAtom";

interface ChatProps {
  id: number;
  session: Session | null;
}

// Define the type for a chat message
type ChatMessage = {
  id:number | null;
  image: string;
  name: string;
  text: string;
};

type User = {
  id: string;
  image: string;
  name: string
  role: "user" | "admin";
}
  
export default function Chat(props: ChatProps) {
  const { id, session } = props;
  const [socket, setSocket] = useState<Socket | null>(null); // Type the socket
  const [msg, setMsg] = useState('');
  const [is_connection , setIs_connection] = useState<boolean>(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]); // Use the ChatMessage type
  const [urlName, setUrlName] = useState<string | null | undefined>(null);
  const [WFRoomID, ] = useAtom<string | null>(WatchWinFriendRooomId);
  const [Users, setUsers] = useState<User[]>([]);
  const [isHost, setIsHost] = useAtom<boolean>(IsPartyHost);
  const [me , setMe] = useState<User | null>(null);
  const VideoTimeInterval = useRef<NodeJS.Timeout>();
  const [VideoRef, ] = useAtom<HTMLVideoElement | null>(VideoPlayerRef);

  useEffect(() => {
    let me_data:User;
    console.log("WFRoomID:",WFRoomID);
    const socket = io('https://live-data.tokuly.com', {
      path: '/wwf/socket.io/',
    });
    setSocket(socket);
    async function connectChat(){
      const roomId = WFRoomID;
      console.log(roomId);
      if (session?.user) {
        socket.on("connect", () => {
          setUrlName(session?.user?.name);
          socket.emit("join", { roomId: roomId, name: session?.user?.name, image: session?.user?.image });
          setIs_connection(true);
        });
      } else {
          setUrlName("guest");
          socket.on("connect", () => {
            socket.emit("join", { roomId: roomId, name: "guest" , image: "guest"});
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
        }else{
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
      VideoRef.addEventListener('play', () => {
        socket?.emit('play');
      });
      VideoRef.addEventListener('pause', () => {
        socket?.emit('pause');
      });
      VideoRef.addEventListener('seeked', () => {
        socket?.emit('video_time', {time:VideoRef.currentTime,playing: !VideoRef.paused});
      });
      VideoTimeInterval.current = setInterval(() => {
        socket?.emit('video_time', {time:VideoRef.currentTime,playing: !VideoRef.paused});
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
      socket?.on('play', () => {
        VideoRef.play();
      });
      socket?.on('pause', () => {
        VideoRef.pause();
      });
      socket?.on('video_time', (time) => {
        if (Math.abs(VideoRef.currentTime - time.time) > 1.5) {
          VideoRef.currentTime = time.time;
        }
        if (time.playing) {
          VideoRef.play();
        }
      });
      return () => {
        socket?.off('play');
        socket?.off('pause');
        socket?.off('video_time');
      };
    }
  }, [VideoRef, isHost, socket]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    if (socket) {
      e.preventDefault();

      if (msg === '') {
        return;
      }

      socket.emit('post', { text: msg});

      setMsg('');
    }
  };

  return (
    <div className="w-[100%] h-[600px] bg-[White] rounded-[10px] border-[1px] mb-[10px]">
      <div className="text-center border-b-[1px]">
        <p className=" pt-2">一緒に観る</p>
        <div className='flex items-center m-[5px]'>
          <AvatarGroup avatarDataList={Users} max={4} />
            <div className='flex ml-auto items-center m-[5px] ounded-[10px] border-[1px] px-[10px] py-[3px] rounded-[10px]'>
              <Crown className='mr-[5px]' color='gold'/>
              <img className="w-[30px] h-[30px] aspect-square object-cover rounded-full" src={Users.find(user => user.role === 'admin')?.image ?? ''}></img>
            </div>
          </div>
      </div>
      <div className="h-[75%] bg-[#ffffff] overflow-y-scroll flex flex-col-reverse">
      {messages.map((message, index) => (
          <div className="m-1 flex items-center chat-message" key={index}>
            <img src={message.image} className='w-[20px] h-[20px] object-cover rounded-full mr-1'></img>
            <span className='mr-[10px] text-[grey] text-[14px] shrink-0 break-keep chat-message-name max-w-[40%] text-ellipsis-1'>{message.name}</span>
            <span className='text-[16px] chat-message-text'> {message.text}</span>
          </div>
      ))}
        {is_connection && (
          <>
            {!session?.user && (
              <p className="text-[#5f5f5f] ml-[10px] chat-status">ゲストとして参加中</p>
            )}
            <p className="text-[#5f5f5f] m-[10px] chat-status">パーティーに接続しました</p>
          </>
        )}
      </div>
        <form onSubmit={handleSubmit}>
          <div className="flex justify-center w-[100%] items-center">
            <input
              type="text"
              id="msg"
              autoComplete="off"
              value={msg}
              onChange={(e) => setMsg(e.target.value)}
              className="w-full ml-[10px] my-[10px] block border-solid divide-inherit border-2 rounded-md	h-[30px]"
            />
            <button type="submit" className="w-[40px] h-[40px] p-1 pr-3 ml-2">
              <Send className="m-auto" size={24} />
            </button>
          </div>
        </form>
    </div>
  );
}