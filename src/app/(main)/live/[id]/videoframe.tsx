"use client";
import React from 'react';
import Image from 'next/image';
import Video from './player';
import DefaultErrorPage from 'next/error'
import Live from './Live';
type Flameprops = {
    live:Live,
}
type Live = {
    id:number,
    title:string,
    status:string,
    stream_name:string,
    thumbnail_url:string,
    ch_name:string,
    ch_icon:string,
    ch_handle:string,
  }
export default function Videoflame(props:Flameprops) {
  const {live} = props;
  return (
    <div className='w-[100%] h-[100%]'>
        {live.status == 'online' ?(
            <Video id={live.stream_name} />
        ):(
            <div style={{ width: '100%',maxHeight: 600 , background:'black',aspectRatio:'16/9',backgroundImage:'url('+live.thumbnail_url+')',backgroundSize:'cover',position:'relative'}}>
                <div style={{position:'absolute',backgroundColor:'rgba(0,0,0,0.6)',left:0,bottom:0,margin:10,padding:10,borderRadius:10}}>
                    <p className='text-white'>ストリーマーを待っています</p>
                </div>
            </div>
        )}
    </div>
  )
}
