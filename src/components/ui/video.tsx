"use client";
import Link from "next/link";
import { useState } from "react";
import type { Live, LiveList } from "@/types/live";

export default function Video({live}:{live:LiveList}) {
  return (
    <Link
      href={"/video/" + live.stream_name}
      className="block w-full max-w-[250px] mx-auto"
    >
      <div
        className="relative"
      >
        <img
          src={live.thumbnail_url}
          className="w-full rounded-lg aspect-video object-cover"
        />
        <div className="absolute bg-white w-[100px] h-[25px] top-[5px] left-[5px] rounded-md">
          <p className="text-black text-center font-semibold">アーカイブ</p>
        </div>
      </div>
      <div className="flex m-1 overflow-hidden">
        <img
          src={live.ch_icon}
          className="w-[40px] h-[40px] rounded-full aspect-square mr-1 object-cover"
        />
        <div className="flex-1 min-w-0">
          <p className="font-bold mb-0 truncate">{live.title}</p>
          <p className="mt-0 text-sm">{live.ch_name}</p>
        </div>
      </div>
    </Link>
  );
}
