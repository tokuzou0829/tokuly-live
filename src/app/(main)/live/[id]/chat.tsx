"use client";
import React, { useEffect, useState } from 'react';
import io, { Socket } from 'socket.io-client';
import Image from 'next/image';
import NextAuth, { type Session } from "next-auth";

  interface ChatProps {
    id: number;
    session: Session | null;
  }
  
  // Define the type for a chat message
  type ChatMessage = {
    id:number | null;
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
    const [urlRoomId, setUrlRoomId] = useState<number>(0);
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
          console.log('API Response:', responseData);
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
  
        const url = new URL(window.location.href);
        const params = url.searchParams;
  
        const roomId = id;
        setUrlRoomId(roomId);
        if (session?.user) {
          const name = session.user.name;
          const token = session.user.token;
          setUrlName(name);
          setToken(token)
          socket.on('connect', () => {
            socket.emit('join', { roomId:roomId, name:name, token:token });
            setIs_connection(true);
          });
        }else{
          setUrlName("guest");
          socket.on('connect', () => {
            socket.emit('join', { roomId:roomId, name:"guest", token:token });
            setIs_connection(true);
          });
        }
  
        socket.on('message', (msg) => {
          setMessages((prevMessages) => [msg, ...prevMessages]);
        });
  
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
      <div className="w-[100%] lg:w-[25%] h-[600px] bg-[White] rounded-[10px] lg:rounded-[0px]">
        <div className="h-[40px] text-center border-b-[1px]">
          <p className=" pt-2">チャット</p>
        </div>
        <div className="h-[80%] bg-[#ffffff] overflow-y-scroll flex flex-col-reverse">
        {messages.map((message, index) => (
            <div className="m-1 flex items-center chat-message" key={index}>
              <span className='mr-[10px] text-[grey] text-[14px] chat-message-name'>{message.name}</span>
              <span className='text-[16px] chat-message-text'> {message.text}</span>
            </div>          ))}
          {is_connection && (
            <p className="text-[#5f5f5f] m-[10px] chat-status">チャットに接続しました</p>
          )}
          {history_messages.map((message, index) => (
            <div className="m-1 flex items-center chat-message" key={index}>
              <span className='mr-[10px] text-[grey] text-[14px] chat-message-name'>{message.name}</span>
              <span className='text-[16px] chat-message-text'> {message.text}</span>
            </div>
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
                className="w-[95%] m-[10px] block border-solid divide-inherit border-2 rounded-md	h-[30px]"
              />
            </div>
            <div className="text-right mr-[20px]">
              <button type="submit" className="ml-[auto]">
                チャット
              </button>
            </div>
          </form>
        ) : (
          <div className="w-[100%] h-[60px] border-t-[1px]">
            <p className=" w-[fit-content] pt-[25px] m-[auto]">ログインしてチャットに参加</p>
          </div>
        )}
      </div>
    );
  }