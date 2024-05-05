import * as fetch from "@/utils/fetch";
import { notFound } from "next/navigation";
import type { Channel, Channels } from "@/types/channel";

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
