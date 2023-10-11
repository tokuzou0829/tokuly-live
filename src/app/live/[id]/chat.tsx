"use client";
import React, { useEffect, useState } from 'react';
import io, { Socket } from 'socket.io-client';
import Image from 'next/image';
import NextAuth, { type DefaultSession } from "next-auth";

interface Session {
    user: {
      id: string;
      createdAt: string;
      kids: boolean;
      prefectureId: null | number;
      updatedAt: string;
      image: string;
    } & DefaultSession["user"];
  }
  
  interface ChatProps {
    id: number;
    session: Session | null;
  }
  
  // Define the type for a chat message
  type ChatMessage = {
    name: string;
    text: string;
  };
  
  export default function Chat(props: ChatProps) {
    const { id, session } = props;
    const [socket, setSocket] = useState<Socket | null>(null); // Type the socket
    const [msg, setMsg] = useState('');
    const [messages, setMessages] = useState<ChatMessage[]>([]); // Use the ChatMessage type
    const [urlRoomId, setUrlRoomId] = useState<number>(0);
    const [urlName, setUrlName] = useState<string | null | undefined>(null);;
  
    useEffect(() => {
      if (session?.user) {
        const socket = io('https://live-data.tokuly.com', {
          path: '/chat/socket.io/',
        });
        setSocket(socket);
  
        const url = new URL(window.location.href);
        const params = url.searchParams;
  
        const roomId = id;
        const name = session.user.name;
        setUrlRoomId(roomId);
        setUrlName(name);
  
        socket.on('connect', () => {
          socket.emit('join', { roomId, name });
        });
  
        socket.on('message', (msg) => {
          setMessages((prevMessages) => [msg, ...prevMessages]);
        });
  
        return () => {
          socket.disconnect();
        };
      }
    }, []);
  
    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
      if (socket) {
        e.preventDefault();
  
        if (msg === '') {
          return;
        }
  
        socket.emit('post', { text: msg, name: urlName });
  
        setMsg('');
      }
    };
  
    return (
      <div className="w-[100%] lg:w-[25%] h-[600px] bg-[#cdf9f9] rounded-[10px] lg:rounded-[0px]">
        <div className="h-[40px] text-center mt-[10px]">
          <p className="">チャット</p>
        </div>
        <div className="h-[80%] bg-[#ffffff] overflow-y-scroll flex flex-col-reverse">
          {messages.map((message, index) => (
            <p className="m-1" key={index}>{`${message.name}: ${message.text}`}</p>
          ))}
        </div>
        {session?.user ? (
          <form onSubmit={handleSubmit}>
            <div className="flex justify-center">
              <input
                type="text"
                id="msg"
                autoComplete="off"
                value={msg}
                onChange={(e) => setMsg(e.target.value)}
                className="w-[95%] m-[10px] block"
              />
            </div>
            <div className="text-right mr-[20px]">
              <button type="submit" className="ml-[auto]">
                チャット
              </button>
            </div>
          </form>
        ) : (
          <p>ログインしてチャットに参加</p>
        )}
      </div>
    );
  }