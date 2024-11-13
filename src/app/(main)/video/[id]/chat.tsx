"use client";
import React, { useEffect, useState } from 'react';
import io, { Socket } from 'socket.io-client';
import NextAuth, { type Session } from "next-auth";

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
    const [socket, setSocket] = useState<Socket | null>(null);
    const [is_connection , setIs_connection] = useState<boolean>(false);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
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
          //console.log('API Response:', responseData);
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
  
    return (
      <div className="w-[100%] h-[600px] bg-[White] rounded-[10px] border-[1px] mb-[10px]">
        <div className="h-[40px] text-center border-b-[1px]">
          <p className=" pt-2">チャット</p>
        </div>
        <div className="h-[80%] bg-[#ffffff] overflow-y-scroll flex flex-col-reverse">
        {messages.map((message, index) => (
            <div className="m-1 flex items-center chat-message" key={index}>
              <img src={message.image} className='w-[20px] h-[20px] object-cover rounded-full mr-1'></img>
              <span className='mr-[10px] text-[grey] text-[14px] shrink-0 break-keep chat-message-name max-w-[40%] text-ellipsis-1'>{message.name}</span>
              <span className='text-[16px] chat-message-text'> {message.text}</span>
            </div>          ))}
          {is_connection && (
            <p className="text-[#5f5f5f] m-[10px] chat-status">チャットに接続しました</p>
          )}
          {history_messages.map((message, index) => (
            <div className="m-1 flex items-center chat-message" key={index}>
              <img src={message.image} className='w-[20px] h-[20px] object-cover rounded-full mr-1'></img>
              <span className='mr-[10px] text-[grey] text-[14px] shrink-0 break-keep chat-message-name max-w-[40%] text-ellipsis-1'>{message.name}</span>
              <span className='text-[16px] chat-message-text'> {message.text}</span>
            </div>
          ))}
        </div>
        <div className="w-[100%] h-[60px] border-t-[1px]">
          <p className=" w-[fit-content] pt-[25px] m-[auto]">アーカイブのため参加できません</p>
        </div>
      </div>
    );
  }