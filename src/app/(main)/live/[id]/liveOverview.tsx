"use client";
import React from "react"
import  formatDistanceToNowStrict from 'date-fns/formatDistanceToNowStrict';
import { ja } from "date-fns/locale"
import { utcToZonedTime } from 'date-fns-tz';

export default function LiveOverview({liveStartTime,overview}:{liveStartTime:string,overview:string}) {
    function linkify(text: string): JSX.Element[] {
        const urlRegex = /(\b(https?):\/\/[-A-Z0-9+&@#/%?=~_|!:,.;]*[-A-Z0-9+&@#/%=~_|])/gi;
        return text.split(urlRegex).map((part, i) => 
            urlRegex.test(part) ? <a href={part} key={i} target="_blank" rel="noopener noreferrer">{part}</a> : <span key={i}>{part}</span>
        );
    }
    function formatDate(): string{
        const timeZone = 'Asia/Tokyo';
        const zonedDate = utcToZonedTime(liveStartTime, timeZone);
        return formatDistanceToNowStrict(zonedDate, {locale: ja});
    }
    return(
        <div className=' h-[100%] bg-[#fffefe] p-[10px] m-2 rounded-lg'>
            <p className="font-bold text-slate-900	">{formatDate()}前に配信開始</p>
            <p className='mb-0'>{linkify(overview)}</p>
        </div>
    )
}