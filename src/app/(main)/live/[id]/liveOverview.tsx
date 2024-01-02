"use client";
import React,{useEffect,useState} from "react"
import  formatDistanceToNowStrict from 'date-fns/formatDistanceToNowStrict';
import { ja } from "date-fns/locale"
import { utcToZonedTime } from 'date-fns-tz';
type Live = {
    id:number,
    title:string,
    status:string,
    stream_name:string,
    thumbnail_url:string,
    stream_overview:string,
    stream_start_time:string,
    ch_name:string,
    ch_icon:string,
    ch_handle:string,
  }
export default function LiveOverview({livename,liveStartTime,overview}:{livename:string,liveStartTime:string,overview:string}) {
    const [status,setStatus] = useState<string>("offline");
    const [streamOverview ,setStreamOverview] = useState<string>(overview);
    const [StreamStartTime, setStreamStartTime] = useState<string>(liveStartTime);
    function linkify(text:string) {
        const urlRegex = /(\bhttps?:\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/gi;
        
        return text.split('\n').map((line, index, array) => (
          <span key={index}>
            {line.split(urlRegex).map((part, i) =>
              urlRegex.test(part) ? <a href={part} key={i} target="_blank" rel="noopener noreferrer" className="text-blue-500">{part}</a> : part
            )}
            {index !== array.length - 1 && <br />}
          </span>
        ));
      }
          
    function formatDate(stream_overview_data:string): string{
        if(stream_overview_data===""){
            const timeZone = 'Asia/Tokyo';
            const zonedDate = utcToZonedTime(stream_overview_data, timeZone);
            return formatDistanceToNowStrict(zonedDate, {locale: ja})+'前に配信開始';
        }else{
            return "ストリーマーを待機中"
        }
    }

    useEffect(() => {
        const id = setInterval(ChecksStatus,10000)
        return () => clearInterval(id)
    },[])

    async function ChecksStatus(){
    if(status !== 'online'){
        const res = await fetch("https://api.tokuly.com/live/stream/data",{ next: {revalidate: 10,},method: 'POST',  headers: {
        "Content-Type": "application/x-www-form-urlencoded"
        },
        body: "name="+livename});
        const errorCode:Number = await res.status;
        const newLivedata:Live= await res.json();
        setStatus(newLivedata.status);
        setStreamOverview(newLivedata.stream_overview);
        setStreamStartTime(newLivedata.stream_start_time);
    }
    }
    return(
        <div className=' h-[100%] bg-[#fffefe] p-[10px] m-2 rounded-lg'>
            <p className="font-bold text-slate-900	">{formatDate(StreamStartTime)}</p>
            <p className='mb-0'>{linkify(streamOverview)}</p>
        </div>
    )
}