import React, { useEffect,useState } from 'react';
import Image from 'next/image';
import './tokuly-livestyle.css'; // スタイルシートをインポート
import icon from './tokuly.png';
type Lives = {
  lives: Live[]
}
type Live = {
  id:string,
  title:string,
  stream_name:string,
  thumbnail_url:string,
  ch_name:string,
  ch_icon:string,
  ch_handle:string,
}
export default async function Home() {
  const response = await fetch("https://api.tokuly.com/live/online/get",{method: "POST", cache: 'no-store'});
  const lives:Lives = await response.json();
  return (
    <div>
      {lives.lives.length === 0 ? (
        <p style={{fontSize:20,textAlign:'center',marginTop:20}}>まだ配信は行われていないようです</p>
      ) : (
        <div className="flex flex-wrap">
        {lives.lives.map((live, index) => (
          <a key={index} href={"/live/"+live.stream_name} className="m-3 block w-[250px] shrink-0">
            <div className="relative">
              <img src={live.thumbnail_url} className='w-[250px] rounded-lg' />
              <div className='absolute bg-red-600 w-[100px] h-[25px] top-[5px] left-[5px] rounded-md'>
                <p className=' text-white text-center	font-semibold	'>ライブ配信</p>
              </div>
            </div>
            <div className='flex m-1'>
              <img src={live.ch_icon} className='w-[40px] h-[40px] rounded-full aspect-square mr-1  object-cover'/>
              <div>
                <p className='font-bold mb-0'>{live.title}</p>
                <p className='mt-0 text-sm'>{live.ch_name}</p>
              </div>
            </div>
          </a>
        ))}
        </div>
      )}
    </div>
  )

}
