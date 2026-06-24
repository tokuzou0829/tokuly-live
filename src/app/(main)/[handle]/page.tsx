import React from "react";
import { getChannel } from "@/requests/channel";
import Live from "@/components/ui/live";
import Video from "@/components/ui/video";
import { ContentCard } from "@/components/ui/content-card";
export const revalidate = 0;

export async function generateMetadata({ params }: { params: { handle: string } }) {
  const channel = await getChannel({ handle: params.handle });

  return {
    title: channel.name,
    description: channel.self_introduction,
    keywords: ["ライブ配信", channel.name],
    twitter: {
      card: "summary",
      images: [`https://live.tokuly.com/api/og/ch_icon?handle=${channel.handle}`],
    },
    openGraph: {
      title: channel.name,
      description: channel.self_introduction,
      url: "https://live.tokuly.com/" + channel.handle,
      siteName: "Tokuly Live",
      images: {
        url: `https://live.tokuly.com/api/og/ch_icon?handle=${channel.handle}`,
        width: 512,
        height: 512,
      },
    },
  };
}
export default async function LivePlayer({ params }: { params: { handle: string } }) {
  const channel = await getChannel({ handle: params.handle });

  return (
    <div className="h-[100%] w-[100%]">
      <div className="h-[100%] w-[100%]">
        <img src={channel.banner_url} className=" w-[100%] h-[15%] object-cover bg-[#bffff9]" />
        <div className=" flex items-center mx-[20px] mt-[10px]">
          <img
            src={channel.icon_url}
            className=" w-[80px] h-[80px] rounded-full mr-[10px]  object-cover"
          />
          <div>
            <p className=" text-xl font-semibold">{channel.name}</p>
          </div>
        </div>
        {channel.streams.length !== 0 && (
          <div className="mx-[20px] mt-[20px]">
            <p className=" text-xl font-semibold">このクリエイターは配信中です！</p>
            <div className="overflow-scroll	w-[100%] flex py-3">
              {channel.streams.map((stream, index) => (
                <Live key={index} live={stream} />
              ))}
            </div>
          </div>
        )}
        {channel.waiting.length !== 0 && (
          <div className="mx-[20px] mt-[20px]">
            <p className=" text-xl font-semibold">このクリエイターの予定</p>
            <div className="overflow-scroll	w-[100%] flex py-3">
              {channel.waiting.map((stream, index) => (
                <ContentCard
                  key={index}
                  href={"/live/" + stream.stream_name}
                  title={stream.title}
                  thumbnailUrl={stream.thumbnail_url}
                  channelName={channel.name}
                  channelIcon={channel.icon_url}
                />
              ))}
            </div>
          </div>
        )}
        {channel.archives && channel.archives.length !== 0 && (
          <div className="mx-[20px] mt-[20px]">
            <p className=" text-xl font-semibold">アーカイブ配信</p>
            <div className="overflow-scroll w-[100%] flex py-3">
              {channel.archives.map((archive, index) => (
                <Video key={index} live={archive} />
              ))}
            </div>
          </div>
        )}

        {channel.videos && channel.videos.length !== 0 && (
          <div className="mx-[20px] mt-[20px]">
            <p className=" text-xl font-semibold">アップロードした動画</p>
            <div className="overflow-scroll w-[100%] flex py-3">
              {channel.videos.map((videos, index) => (
                <Video key={index} live={videos} />
              ))}
            </div>
          </div>
        )}
        <div className="mx-[20px] mt-[20px]">
          <p className=" text-xl font-semibold">このクリエイターについて</p>
          <p>{channel.self_introduction}</p>
        </div>
      </div>
    </div>
  );
}
