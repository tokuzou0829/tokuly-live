import React from 'react';
import Image from 'next/image';
import { notFound } from 'next/navigation'

import Link from 'next/link';
type Channel = {
    id:string,
    name:string,
    handle:string,
    banner_url:string,
    icon_url:string,
    self_introduction:string,
    game:string,
    streams:Stream[],
    waiting:Stream[]
  }
  type Stream = {
    title:string,
    thumbnail_url:string,
    stream_name:string
  }
  export async function generateMetadata({ params }: { params: { handle: string } }) {  
    const res = await fetch("https://api.tokuly.com/live/channel/get",{ cache: 'no-store',method: 'POST',  headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: "handle="+params.handle});
      const errorCode:Number = await res.status;
      const ch:Channel= await res.json();
  
    return {
      title: ch.name,
      description: ch.self_introduction,
      icons: "/favicon.ico",
      keywords: ["ライブ配信",ch.name],
      twitter: {
          card: "summary",
          images: ['https://live.tokuly.com/api/og/ch_icon?handle=' + ch.handle]
      },
      openGraph: {
          title: ch.name,
          description: ch.self_introduction,
          url: 'https://tokuly.com/'+ch.handle,
          siteName: 'Tokuly Live',
          images: {
              url: 'https://live.tokuly.com/api/og/ch/ch_icon?handle=' + ch.handle,
              width:1200,
              height:630,
          },
      }
    };
  }
export default async function LivePlayer({ params }: { params: { handle: string } }) {
  const res = await fetch("https://api.tokuly.com/live/channel/get",{ cache: 'no-store',method: 'POST',  headers: {
    "Content-Type": "application/x-www-form-urlencoded"
  },
  body: "handle="+params.handle});
  const errorCode:Number = await res.status;
  const ch:Channel= await res.json();
  if(errorCode !== 200){
    return notFound();
  }
  return (
    <div className="h-[100%] w-[100%]">
        {errorCode == 200 ?(
            <div className="h-[100%] w-[100%]">
                <img src={ch.banner_url} className=" w-[100%] h-[15%] object-cover bg-[#bffff9]" />
                <div className=" flex items-center mx-[20px] mt-[10px]">
                    <img src={ch.icon_url} className=" w-[80px] h-[80px] rounded-full mr-[10px]  object-cover" />
                    <div>
                        <p className=" text-xl font-semibold">{ch.name}</p>
                    </div>
                </div>
                {(ch.streams.length !== 0 &&(
                <div className="mx-[20px] mt-[20px]">
                    <p className=" text-xl font-semibold">このクリエイターは配信中です！</p>
                    <div className="overflow-scroll	w-[100%] flex py-3">
                    {ch.streams.map((stream, index) => (
                        <Link key={index} href={"/live/"+stream.stream_name} className="block w-[250px] shrink-0 mr-2">
                        <div className="relative">
                            <img src={stream.thumbnail_url} className='w-[250px] rounded-lg aspect-video object-cover bg-gray-500' />
                            <div className='absolute bg-red-600 w-[100px] h-[25px] top-[5px] left-[5px] rounded-md'>
                            <p className=' text-white text-center	font-semibold	'>ライブ配信</p>
                            </div>
                        </div>
                        <div className='flex m-1 mr-0'>
                            <img src={ch.icon_url} className='w-[40px] h-[40px] rounded-full aspect-square mr-1 object-cover bg-gray-500'/>
                            <div>
                            <p className='font-bold mb-0 truncate w-[205px]'>{stream.title}</p>
                            <p className='mt-0 text-sm'>{ch.name}</p>
                            </div>
                        </div>
                        </Link>
                    ))}
                    </div>
                </div>
                ))}
                {(ch.waiting.length !== 0 &&(
                    <div className="mx-[20px] mt-[20px]">
                        <p className=" text-xl font-semibold">このクリエイターの予定</p>
                        <div className="overflow-scroll	w-[100%] flex py-3">
                            {ch.waiting.map((stream, index) => (
                            <Link key={index} href={"/live/"+stream.stream_name} className="block w-[250px] shrink-0 mr-2">
                            <div className="relative">
                                <img src={stream.thumbnail_url} className='w-[250px] rounded-lg aspect-video object-cover bg-gray-500' />
                            </div>
                            <div className='flex m-1 mr-0'>
                                <img src={ch.icon_url} className='w-[40px] h-[40px] rounded-full aspect-square mr-1 object-cover bg-gray-500'/>
                                <div>
                                <p className='font-bold mb-0 truncate w-[205px]'>{stream.title}</p>
                                <p className='mt-0 text-sm'>{ch.name}</p>
                                </div>
                            </div>
                            </Link>
                        ))}
                        </div>
                    </div>
                ))}
                <div className="mx-[20px] mt-[20px]">
                    <p className=" text-xl font-semibold">このクリエイターについて</p>
                    <p>{ch.self_introduction}</p>
                </div>
            </div>
        ):(
            <div>
                <p>ユーザーが見つかりませんでした。</p>
            </div>
        )}
    </div>
  )
}
