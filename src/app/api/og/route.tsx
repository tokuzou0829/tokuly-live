import { ImageResponse } from "next/server";
import { NextRequest } from "next/server";

export const runtime = "edge";
type Live = {
  id:number,
  title:string,
  status:string,
  stream_name:string,
  thumbnail_url:string,
  ch_name:string,
  ch_icon:string,
  ch_handle:string,
}
export async function GET(req: NextRequest): Promise<Response | ImageResponse> {
  const { searchParams } = new URL(req.url);
  const video_id = searchParams.get("video_id");
  const res = await fetch("https://api.tokuly.com/live/online/check",{cache: 'no-store',method: 'POST',  headers: {
    "Content-Type": "application/x-www-form-urlencoded"
  },
  body: "name="+video_id});
  const errorCode:Number = await res.status;
  
  const video = await fetch("https://api.tokuly.com/live/stream/data",{ cache: 'no-store',method: 'POST',  headers: {
    "Content-Type": "application/x-www-form-urlencoded"
  },
  body: "name="+video_id});
  const live:Live= await video.json();
  if (video_id && errorCode == 200) {
    return new ImageResponse(
      (
        <div
          style={{
            height: "100%",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            background: "#fff",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "250px",
            position:"relative"
           }}
        >
          <img style={{height: "100%",width: "100%",objectFit:'cover'}} src={live.thumbnail_url} />
        </div>
      ),
      {
        width: 1200,
        height: 630,
        emoji: "fluent",
      }
    );
  } else {
    return new Response(`Failed to generate the image`, {
      status: 400,
    });
  }
}