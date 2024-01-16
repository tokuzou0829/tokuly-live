import * as fetch from "@/utils/fetch";
import type { Channels } from "@/types/channel";
import { notFound } from "next/navigation";

type Channel = {
  id: string;
  name: string;
  handle: string;
  banner_url: string;
  icon_url: string;
  self_introduction: string;
  game: string;
  streams: Stream[];
  waiting: Stream[];
};

type Stream = {
  title: string;
  thumbnail_url: string;
  stream_name: string;
};

type Handle = {
  handle: string;
};

export async function getChannel(param: Handle): Promise<Channel> {
  try {
    const formData = new FormData();
    formData.append("handle", param.handle);

    return await fetch.post<FormData, Channel>(`/live/channel/get`, formData, {
      headers: {},
    });
  } catch (e) {
    notFound();
  }
}

export async function getRecommendChannel(): Promise<Channels> {
  return await fetch.post<null, Channels>(
    `/live/channel/recommendation`,
    null,
    {
      headers: {},
    }
  );
}
