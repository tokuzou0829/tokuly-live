"use client";
import React, { useEffect, useState } from 'react';
import io from 'socket.io-client';
import Image from 'next/image';

interface ChatProps {
    id: number;
}
type Chat = {
    id:number,
    user:string,
    content:string,
}
export default function Chat(props) {
    const {id,session} = props;
    const [socket, setSocket] = useState(null);
    const [msg, setMsg] = useState('');
    const [messages, setMessages] = useState([]);
    const [urlRoomId, setUrlRoomId] = useState(null);
    const [urlName, setUrlName] = useState(null);
  
    useEffect(() => {
        if (session?.user) {
        const socket = io("https://live-data.tokuly.com",{
            path: "/chat/socket.io/"
          });
        setSocket(socket);
    
        const url = new URL(window.location.href);
        const params = url.searchParams;
    
        const roomId = id;
        const name = session.user.name;
        setUrlRoomId(roomId);
        setUrlName(name);
    
        socket.on("connect", () => {
            socket.emit("join", { roomId, name });
        });
    
        socket.on("message", (msg) => {
            setMessages((prevMessages) => [msg, ...prevMessages]);
        });
    
        return () => {
            socket.disconnect();
        };
    }
    }, []);
  
    const handleSubmit = (e) => {
      e.preventDefault();
  
      if (msg === "") {
        return;
      }
  
      socket.emit("post", { text: msg, name: urlName });
  
      setMsg('');
    };

return(
    <div className="w-[100%] lg:w-[25%] h-[600px] bg-[#cdf9f9] rounded-[10px] lg:rounded-[0px]">
        <div className="h-[40px] text-center mt-[10px]">
            <p className=''>チャット</p>
        </div>
        <div className='h-[80%] bg-[#ffffff] overflow-y-scroll flex flex-col-reverse'>
        {messages.map((message, index) => (
          <p className="m-1" key={index}>{`${message.name}: ${message.text}`}</p>
        ))}
        </div>
        {session?.user ? (
        <form onSubmit={handleSubmit}>
            <div className='flex justify-center	'>
            <input
            type="text"
            id="msg"
            autoComplete="off"
            value={msg}
            onChange={(e) => setMsg(e.target.value)}
            className='w-[95%] m-[10px] block'
          />
            </div>
            <div className=' text-right mr-[20px]'>
                <button type="submit" className='ml-[auto]'>チャット</button>
            </div>
        </form>
        ):(
            <p>ログインしてチャットに参加</p>
        )}
    </div>
  )
}
