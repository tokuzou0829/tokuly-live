"use client";
import React, { useState, useEffect } from "react";
import Video from "./player";
import Live from "./Live";
import { intervalToDuration, formatDuration } from 'date-fns';
import Link from "next/link";

type Flameprops = {
  live: Live;
};
type Live = {
  id: number;
  title: string;
  status: string;
  stream_name: string;
  thumbnail_url: string;
  ch_name: string;
  ch_icon: string;
  ch_handle: string;
};
export default function Videoflame(props: Flameprops) {
  const { live } = props;
  const [status, setStatus] = useState<string>(live.status);
  const [isArchive, setIsArchive] = useState<boolean>(false);
  const [archivevideoTime, setArchivevideoTime] = useState<number>(0);
  useEffect(() => {
    let archivecheckstatus = false;
    async function ChecksStatus() {
      if (status !== "online") {
        const res = await fetch("https://api.tokuly.com/live/stream/data", {
          cache: "no-store",
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: "name=" + live.stream_name,
        });
        const newLivedata: Live = await res.json();
  
        //console.log(newLivedata.status);
        setStatus(newLivedata.status);
        if(newLivedata.status === "end" && !archivecheckstatus){
          const checkvideo = await fetch(`https://live-data.tokuly.com/videos/hls/${live.stream_name}/index.m3u8`, {
            method:"GET",
            headers: {},
          });
          if (checkvideo.ok) {
            const m3u8Content = await checkvideo.text();
          
            // マスタープレイリストにビットレートがあるか確認
            const playlistMatches = m3u8Content.match(/#EXT-X-STREAM-INF:[^\n]+\n([^\n]+)/g);
          
            let totalDuration = 0;
            if (playlistMatches) {
              // マスタープレイリストに複数ビットレートがある場合
              let longestDuration = 0;
              const playlistUrl = playlistMatches[0].split('\n')[1].trim();
        
              // サブプレイリスト（ビットレート別M3U8ファイル）をフェッチ
              const response = await fetch(`https://live-data.tokuly.com/videos/hls/${live.stream_name}/${playlistUrl}`);
              if (!response.ok) {
                throw new Error(`Failed to fetch playlist: ${playlistUrl}`);
              }
        
              const subPlaylistContent = await response.text();
        
              // サブプレイリストのEXTINFの値を取得
              const extinfMatches = subPlaylistContent.match(/#EXTINF:([\d\.]+)/g);
              if (extinfMatches) {
                let subPlaylistDuration = 0;
                extinfMatches.forEach(match => {
                  const duration = parseFloat(match.split(':')[1]);
                  subPlaylistDuration += duration;
                });
        
                // 最長のプレイリストを保存
                if (subPlaylistDuration > longestDuration) {
                  longestDuration = subPlaylistDuration;
                }
              }
          
              totalDuration = longestDuration;
            } else {
              // 単一ビットレートの場合、元の処理を実行
              const extinfMatches = m3u8Content.match(/#EXTINF:([\d\.]+)/g);
              
              if (!extinfMatches) {
                throw new Error('No EXTINF tags found in M3U8 file');
              }
          
              // すべての#EXTINFタグの値を合計
              extinfMatches.forEach(match => {
                const duration = parseFloat(match.split(':')[1]);
                totalDuration += duration;
              });
            }
          
            setArchivevideoTime(totalDuration);
            setIsArchive(true);
            archivecheckstatus = true;
          }          
        }
      }
    }
    async function archivecheck(){
      if(!isArchive){
        const checkvideo = await fetch(`https://live-data.tokuly.com/videos/hls/${live.stream_name}/index.m3u8`, {
          method:"GET",
          headers: {},
        });
        if (checkvideo.ok) {
          const m3u8Content = await checkvideo.text();
        
          // マスタープレイリストにビットレートがあるか確認
          const playlistMatches = m3u8Content.match(/#EXT-X-STREAM-INF:[^\n]+\n([^\n]+)/g);
        
          let totalDuration = 0;
          if (playlistMatches) {
            // マスタープレイリストに複数ビットレートがある場合
            let longestDuration = 0;
            const playlistUrl = playlistMatches[0].split('\n')[1].trim();
      
            // サブプレイリスト（ビットレート別M3U8ファイル）をフェッチ
            const response = await fetch(`https://live-data.tokuly.com/videos/hls/${live.stream_name}/${playlistUrl}`);
            if (!response.ok) {
              throw new Error(`Failed to fetch playlist: ${playlistUrl}`);
            }
      
            const subPlaylistContent = await response.text();
      
            // サブプレイリストのEXTINFの値を取得
            const extinfMatches = subPlaylistContent.match(/#EXTINF:([\d\.]+)/g);
            if (extinfMatches) {
              let subPlaylistDuration = 0;
              extinfMatches.forEach(match => {
                const duration = parseFloat(match.split(':')[1]);
                subPlaylistDuration += duration;
              });
      
              // 最長のプレイリストを保存
              if (subPlaylistDuration > longestDuration) {
                longestDuration = subPlaylistDuration;
              }
            }
        
            totalDuration = longestDuration;
          } else {
            // 単一ビットレートの場合、元の処理を実行
            const extinfMatches = m3u8Content.match(/#EXTINF:([\d\.]+)/g);
            
            if (!extinfMatches) {
              throw new Error('No EXTINF tags found in M3U8 file');
            }
        
            // すべての#EXTINFタグの値を合計
            extinfMatches.forEach(match => {
              const duration = parseFloat(match.split(':')[1]);
              totalDuration += duration;
            });
          }
        
          setArchivevideoTime(totalDuration);
          setIsArchive(true);
          archivecheckstatus = true;
        }       
      }
    }
    archivecheck();
    const id = setInterval(ChecksStatus, 5000);
    return () => clearInterval(id);
  }, []);


  function secondsToTimeFormat(seconds:number) {
    const totalSeconds = Math.floor(seconds);

    // 時、分、秒を計算
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const remainingSeconds = totalSeconds % 60;
  
    // パディング関数
    const pad = (num:number) => num.toString().padStart(2, '0');
  
    // 時間部分を条件に応じて形成
    let timeString = '';
    if (hours > 0) {
      timeString += `${pad(hours)}:`;
    }
  
    // 分と秒を追加
    timeString += `${pad(minutes)}:${pad(remainingSeconds)}`;
  
    return timeString;
  }

  return (
    <div className="w-[100%]">
      {status == "online" ? (
        <Video id={live.stream_name} />
      ) : (
        <div
          style={{
            width: "100%",
            maxHeight: 600,
            background: "black",
            aspectRatio: "16/9",
            backgroundImage: "url(" + live.thumbnail_url + ")",
            backgroundSize: "cover",
            position: "relative",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          {isArchive ? (
            <Link href={`/video/${live.stream_name}`}>
                <div
                className="bg-black bg-opacity-50 p-4 rounded-lg cursor-pointer transition-all duration-300 flex flex-col items-center"
              >
                <p className="text-white text-xs mb-2">この配信にはアーカイブがあります</p>
                <div className="relative">
                  <img src={live.thumbnail_url} className="w-[200px] aspect-video object-cover rounded" />
                  <div className="absolute bottom-0 right-0 flex justify-between items-center m-1 px-1.5 bg-black bg-opacity-50 rounded-sm">
                    <span className="text-white">{secondsToTimeFormat(archivevideoTime)}</span>
                  </div>
                </div>
              </div>
            </Link>
          ) : (
            <div
              style={{
                position: "absolute",
                backgroundColor: "rgba(0,0,0,0.6)",
                left: 0,
                bottom: 0,
                margin: 10,
                padding: 10,
                borderRadius: 10,
              }}
            >
              <p className="text-white">ストリーマーを待っています</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
