import React from 'react';
import Image from 'next/image';
import Video from './player';
import Viewer from './viewer';
import Chat from './chat';
import { getServerSession } from "next-auth"
import { handler } from '../../api/auth/[...nextauth]/route'
import NextAuth, { type Session } from "next-auth";

interface LiveProps {
    id: string;
}
type Live = {
    id:number,
    title:string,
    stream_name:string,
    thumbnail_url:string,
    ch_name:string,
    ch_icon:string,
    ch_handle:string,
  }
export default async function LivePlayer(props: LiveProps) {
  const session:Session | null = await getServerSession(handler)
  
  const {id} = props;
  const res = await fetch("https://api.tokuly.com/live/stream/data",{ cache: 'no-store',method: 'POST',  headers: {
    "Content-Type": "application/x-www-form-urlencoded"
  },
  body: "name="+id});
  const errorCode:Number = await res.status;
  const live:Live= await res.json();
  return (
    <div className='w-[100%] overflow-hidden'>
      <div className='lg:flex'>
        <Video id={id} />
        <Chat id={live.id} session={session}></Chat>
      </div>
        <div className='flex m-2 w-[100%]'>
              <div className=' relative w-[85px] h-[85px]'>
                <img src={live.ch_icon} className='w-[80px] h-[80px] rounded-full aspect-square m-[auto] object-cover flex-shrink-0 min-w-[80px] m-[2.5px] mt-[0px]' />
                <div className='absolute bg-red-600 w-[85px] h-[25px] bottom-[0px] left-[0px] rounded-md'>
                    <p className=' text-white text-center font-semibold'>ライブ配信</p>
                </div>
              </div>
              <div className='ml-[10px]'>
                <p className='font-bold mb-0 text-xl'>{live.ch_name}</p>
                <p className='mt-0 text-lg'>{live.title}</p>
                <Viewer id={id} /> 
              </div>
        </div>
    </div>
  )
}
