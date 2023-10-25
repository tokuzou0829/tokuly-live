import React from 'react';
import Image from 'next/image';
import DefaultErrorPage from 'next/error'
import Chat from './chat';
import { getServerSession } from "next-auth"
import { handler } from '../../../../api/auth/[...nextauth]/route'
import NextAuth, { type Session } from "next-auth";
type Live = {
    id:number,
    title:string,
    stream_name:string,
    thumbnail_url:string,
    ch_name:string,
    ch_icon:string,
    ch_handle:string,
  }
export default async function LivePage({ params }: { params: { id: string } }) {
  const session:Session | null = await getServerSession(handler)
  const res = await fetch("https://api.tokuly.com/live/online/check",{cache: 'no-store',method: 'POST',  headers: {
    "Content-Type": "application/x-www-form-urlencoded"
  },
  body: "name="+params.id});

  const stream_data_res = await fetch("https://api.tokuly.com/live/stream/data",{ cache: 'no-store',method: 'POST',  headers: {
    "Content-Type": "application/x-www-form-urlencoded"
  },
  body: "name="+params.id});
  const errorCode:Number = await res.status;
  const live:Live= await stream_data_res.json();
  return (
    <div className='w-[100%] h-[100%]'>
        {errorCode == 200 ?(
            <Chat id={live.id} session={session} />
        ):(
            <div>
                <p>配信が見つかりませんでした。</p>
            </div>
        )}
    </div>
  )
}