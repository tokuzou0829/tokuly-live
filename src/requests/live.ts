import * as fetch from "@/utils/fetch";
import { notFound } from "next/navigation";
import { cache } from "react";
import type { Live, LiveList, MoreVideoList, OnlineLiveList } from "@/types/live";

type OnlineCheckParams = {
  id: string;
};

type Lives = {
  lives: OnlineLiveList[];
};
type Archives = {
  archives: LiveList[];
};

export async function getOnlineLiveList(): Promise<Lives> {
  return await fetch.post<null, Lives>(`/live/online/get`, null, {
    headers: {},
  });
}

export async function getArchivesList(): Promise<Archives> {
  return await fetch.post<null, Archives>(`/live/archive/get`, null, {
    headers: {},
  });
}

export async function getRecommendVideo(): Promise<Archives> {
  return await fetch.post<null, Archives>(`/live/video-recommend/get`, null, {
    headers: {},
  });
}

async function requestLive(id: string, signal?: AbortSignal): Promise<Live> {
  const formData = new FormData();
  formData.append("name", id);

  return await fetch.post<FormData, Live>(`/live/stream/data`, formData, {
    headers: {},
    signal,
  });
}

const getLiveForRender = cache(requestLive);

export async function fetchLive(
  param: OnlineCheckParams,
  options?: { signal?: AbortSignal }
): Promise<Live> {
  if (options?.signal) return await requestLive(param.id, options.signal);
  return await getLiveForRender(param.id);
}

export async function getLive(param: OnlineCheckParams): Promise<Live> {
  try {
    return await fetchLive(param);
  } catch (e) {
    notFound();
  }
}

export async function onlineCheck(param: OnlineCheckParams): Promise<any> {
  const formData = new FormData();
  formData.append("name", param.id);

  try {
    const res = await fetch.post<FormData, any>(`/live/online/check`, formData, {
      headers: {},
    });
    if (res.publishing_setting && res.publishing_setting == "friend") {
      notFound();
    }
    return res;
  } catch (e) {
    console.log(e);
    notFound();
  }
}
export async function getMoreVideo(param: OnlineCheckParams): Promise<MoreVideoList[] | null> {
  const formData = new FormData();
  formData.append("name", param.id);

  try {
    return await fetch.post<FormData, MoreVideoList[]>(`/live/video/more`, formData, {
      headers: {},
    });
  } catch (e) {
    return null;
  }
}
export async function VideoCheck(param: OnlineCheckParams): Promise<any> {
  try {
    const res = await fetchLive(param);
    if ((res.status !== "end" && res.status !== "video") || res.publishing_setting == "friend") {
      notFound();
    }
    if (res.status == "end" && !res.archive) {
      notFound();
    }
    return res;
  } catch (e) {
    console.log(e);
    notFound();
  }
}
