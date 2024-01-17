import React from "react";
import Link from "next/link";
import { getChannel } from "@/requests/channel";

export const revalidate = 0;

export async function generateMetadata({
  params,
}: {
  params: { handle: string };
}) {
  const channel = await getChannel({ handle: params.handle });

  return {
    title: channel.name,
    description: channel.self_introduction,
    keywords: ["ライブ配信", channel.name],
    twitter: {
      card: "summary",
      images: [
        `https://live.tokuly.com/api/og/ch_icon?handle=${channel.handle}`,
      ],
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
export default async function LivePlayer({
  params,
}: {
  params: { handle: string };
}) {
  const channel = await getChannel({ handle: params.handle });

  return (
    <div className="h-[100%] w-[100%]">
      <div className="h-[100%] w-[100%]">
        <img
          src={channel.banner_url}
          className=" w-[100%] h-[15%] object-cover bg-[#bffff9]"
        />
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
            <p className=" text-xl font-semibold">
              このクリエイターは配信中です！
            </p>
            <div className="overflow-scroll	w-[100%] flex py-3">
              {channel.streams.map((stream, index) => (
                <Link
                  key={index}
                  href={"/live/" + stream.stream_name}
                  className="block w-[250px] shrink-0 mr-2"
                >
                  <div className="relative">
                    <img
                      src={stream.thumbnail_url}
                      className="w-[250px] rounded-lg aspect-video object-cover bg-gray-500"
                    />
                    <div className="absolute bg-red-600 w-[100px] h-[25px] top-[5px] left-[5px] rounded-md">
                      <p className=" text-white text-center	font-semibold	">
                        ライブ配信
                      </p>
                    </div>
                  </div>
                  <div className="flex m-1 mr-0">
                    <img
                      src={channel.icon_url}
                      className="w-[40px] h-[40px] rounded-full aspect-square mr-1 object-cover bg-gray-500"
                    />
                    <div>
                      <p className="font-bold mb-0 truncate w-[205px]">
                        {stream.title}
                      </p>
                      <p className="mt-0 text-sm">{channel.name}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
        {channel.waiting.length !== 0 && (
          <div className="mx-[20px] mt-[20px]">
            <p className=" text-xl font-semibold">このクリエイターの予定</p>
            <div className="overflow-scroll	w-[100%] flex py-3">
              {channel.waiting.map((stream, index) => (
                <Link
                  key={index}
                  href={"/live/" + stream.stream_name}
                  className="block w-[250px] shrink-0 mr-2"
                >
                  <div className="relative">
                    <img
                      src={stream.thumbnail_url}
                      className="w-[250px] rounded-lg aspect-video object-cover bg-gray-500"
                    />
                  </div>
                  <div className="flex m-1 mr-0">
                    <img
                      src={channel.icon_url}
                      className="w-[40px] h-[40px] rounded-full aspect-square mr-1 object-cover bg-gray-500"
                    />
                    <div>
                      <p className="font-bold mb-0 truncate w-[205px]">
                        {stream.title}
                      </p>
                      <p className="mt-0 text-sm">{channel.name}</p>
                    </div>
                  </div>
                </Link>
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
