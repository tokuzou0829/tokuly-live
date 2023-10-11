import React from 'react';
import Image from 'next/image';
import Video from './player';
import DefaultErrorPage from 'next/error'
import Live from './Live';
export default async function LivePage({ params }: { params: { id: string } }) {
  const res = await fetch("https://api.tokuly.com/live/online/check",{cache: 'no-store',method: 'POST',  headers: {
    "Content-Type": "application/x-www-form-urlencoded"
  },
  body: "name="+params.id});
  const errorCode:Number = await res.status;
  return (
    <div className='w-[100%] h-[100%]'>
        {errorCode == 200 ?(
            <Live id={params.id} />
        ):(
            <div>
                <p>配信が見つかりませんでした。</p>
            </div>
        )}
    </div>
  )
}
