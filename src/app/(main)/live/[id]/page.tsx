import React from 'react';
import Image from 'next/image';
import Video from './player';
import DefaultErrorPage from 'next/error'
import Live from './Live';
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
type Live = {
  id:number,
  title:string,
  status:string,
  stream_name:string,
  thumbnail_url:string,
  stream_overview:string,
  ch_name:string,
  ch_icon:string,
  ch_handle:string,
}
export async function generateMetadata({ params }: { params: { id: string } }) {  
  const res = await fetch("https://api.tokuly.com/live/stream/data",{ cache: 'no-store',method: 'POST',  headers: {
    "Content-Type": "application/x-www-form-urlencoded"
  },
  body: "name="+params.id});
  const errorCode:Number = await res.status;
  const live:Live= await res.json();

  return {
    title: live.title,
    description: live.stream_overview,
    icons: "/favicon.ico",
    keywords: ["ライブ配信"],
    twitter: {
        card: "summary_large_image",
        images: ['https://live.tokuly.com/api/og?video_id=' + params.id]
    },
    openGraph: {
        title: live.title,
        description: live.stream_overview,
        url: 'https://live.tokuly.com/live/'+params.id,
        siteName: 'Tokuly Live',
        images: {
            url: 'https://live.tokuly.com/api/og?video_id=' + params.id,
            width:1200,
            height:630,
        },
    }
  };
}
export default async function LivePage({ params }: { params: { id: string } }) {
  const res = await fetch("https://api.tokuly.com/live/online/check",{cache: 'no-store',method: 'POST',  headers: {
    "Content-Type": "application/x-www-form-urlencoded"
  },
  body: "name="+params.id});
  const errorCode:Number = await res.status;
  if(errorCode !== 200){
    return notFound();
  }
  return (
    <div className='w-[100%] h-[100%]'>
            <Live id={params.id} />
    </div>
  )
}
