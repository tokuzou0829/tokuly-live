import * as fetch from "@/utils/fetch";
import { notFound } from "next/navigation";
import type { Live, LiveList } from "@/types/live";

type OnlineCheckParams = {
  id: string;
};

type Lives = {
  lives: LiveList[];
};

export async function getOnlineLiveList(): Promise<Lives> {
  return await fetch.post<null, Lives>(`/live/online/get`, null, {
    headers: {},
  });
}

export async function getLive(param: OnlineCheckParams): Promise<Live> {
  const formData = new FormData();
  formData.append("name", param.id);

  try {
    return await fetch.post<FormData, Live>(`/live/stream/data`, formData, {
      headers: {},
    });
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
    if(res.publishing_setting && res.publishing_setting == "friend"){
      notFound();
    }
    return res;
  } catch (e) {
    console.log(e);
    notFound();
  }
}

export async function VideoCheck(param: OnlineCheckParams): Promise<any> {
  const formData = new FormData();
  formData.append("name", param.id);
  try {
    const res = await fetch.post<FormData, any>(`/live/stream/data`, formData, {
      headers: {},
    });
    if(res.status == "online" || res.publishing_setting && res.publishing_setting == "friend"){
      notFound();
    }
    const checkvideo = await globalThis.fetch(`https://live-data.tokuly.com/videos/hls/${param.id}/index.m3u8`, {
      method:"GET",
      headers: {},
    });
    if(!checkvideo.ok){
      notFound();
    }
    return res;
  } catch (e) {
    console.log(e);
    notFound();
  }
}
