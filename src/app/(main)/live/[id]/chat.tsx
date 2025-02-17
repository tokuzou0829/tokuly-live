"use client";
import React, { useEffect, useState } from 'react';
import io, { Socket } from 'socket.io-client';
import Image from 'next/image';
import NextAuth, { type Session } from "next-auth";
import { Plane, Send } from 'lucide-react';

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
  
export default function Chat(props: ChatProps) {
  const { id, session } = props;
  const [socket, setSocket] = useState<Socket | null>(null); // Type the socket
  const [msg, setMsg] = useState('');
  const [is_connection , setIs_connection] = useState<boolean>(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]); // Use the ChatMessage type
  const [history_messages, setHistory_messages] = useState<ChatMessage[]>([]);
  const [urlName, setUrlName] = useState<string | null | undefined>(null);;
  const [token, setToken] = useState<string | null | undefined>(null);;
  useEffect(() => {
    const data = new URLSearchParams();
    data.append("stream_id",id.toString());
    // リクエストを送信
    fetch('https://api.tokuly.com/live/stream/chat/get', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: data.toString(),
    })
    .then(response => response.json())
    .then(responseData => {
        const res:ChatMessage[] = responseData;
        setHistory_messages(res);
        // console.log('API Response:', responseData);
    })
    .catch(error => {
        console.error('API Request Error:', error);
    });
  }, []);
  useEffect(() => {
    const socket = io('https://live-data.tokuly.com', {
      path: '/chat/socket.io/',
    });
    setSocket(socket);
    async function connectChat(){
      const roomId = id;
      if (session?.user) {
        const req = await fetch('https://live-data.tokuly.com/chat-auth/',
          {
            method: 'POST',
            body: `{"token":"${session?.user?.access_token}"}`,
            headers: {"Content-Type": "application/json"}
          }
        );
        const chatKey = await req.json();
        const name = session.user.name;
        const token = chatKey.authKey;
        setUrlName(name);
        setToken(token);
        socket.emit("join", { roomId: roomId, name: name, token: token });
        setIs_connection(true);
      } else {
        setUrlName("guest");
        socket.on("connect", () => {
          socket.emit("join", { roomId: roomId, name: "guest", token: "guest" });
          setIs_connection(true);
        });
      }
      socket.on("message", (msg) => {
        setMessages((prevMessages) => [msg, ...prevMessages]);
      });
    }
    connectChat();

    return () => {
      socket.disconnect();
    };
  }, []);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    if (socket && session?.user) {
      e.preventDefault();

      if (msg === '') {
        return;
      }

      socket.emit('post', { text: msg});

      setMsg('');
    }
  };

  return (
    <div className="w-full min-h-[600px] bg-white rounded-lg border flex flex-col">
    <div className="h-10 border-b">
      <p className="pt-2 text-center">チャット</p>
    </div>
    
    <div className="flex-1 bg-white overflow-y-auto flex flex-col-reverse m-2">
      {messages.map((message, index) => (
        <div className="m-1 flex items-center" key={index}>
          <img 
            src={message.image} 
            className="w-5 h-5 object-cover rounded-full mr-1" 
            alt={message.name}
          />
          <span className="mr-2 text-gray-500 text-sm truncate max-w-[40%] shrink-0">
            {message.name}
          </span>
          <span className="text-base">
            {message.text}
          </span>
        </div>
      ))}
      
      {is_connection && (
        <p className="text-gray-600 m-2">
          チャットに接続しました
        </p>
      )}
      {history_messages.map((message, index) => (
          <div className="m-1 flex items-center chat-message" key={index}>
            <img src={message.image} className='w-[20px] h-[20px] object-cover rounded-full mr-1'></img>
            <span className='mr-[10px] text-[grey] text-[14px] shrink-0 break-keep chat-message-name max-w-[40%] text-ellipsis-1'>{message.name}</span>
            <span className='text-[16px] chat-message-text'> {message.text}</span>
          </div>
      ))}
    </div>
    {session?.user ? (
    <form onSubmit={handleSubmit} className="p-2 border-t">
      <div className="flex items-center gap-2">
        <input
          type="text"
          id="msg"
          autoComplete="off"
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
          className="flex-1 max-h-[30px] px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button 
          type="submit" 
          className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 rounded-full"
        >
          <Send size={24} />
        </button>
      </div>
    </form>
    ) : (
      <div className="h-10 border-t">
        <p className="text-center pt-3">
          ログインしてチャットに参加
        </p>
      </div>
    )}
  </div>
  )
}