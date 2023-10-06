import React from 'react';
import Image from 'next/image';
import Video from './player';
import DefaultErrorPage from 'next/error'

export default async function LivePlayer({ params }: { params: { id: string } }) {
  const res = await fetch("https://api.tokuly.com/live/online/check",{method: 'POST',  headers: {
    "Content-Type": "application/x-www-form-urlencoded"
  },
  body: "name="+params.id});
  const errorCode:Number = await res.status;
  return (
    <div>
        {errorCode == 200 ?(
            <Video id={params.id} />
        ):(
            <div>
                <p>配信が見つかりませんでした。</p>
            </div>
        )}
    </div>
  )
}
