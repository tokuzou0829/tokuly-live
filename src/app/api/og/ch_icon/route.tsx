import { ImageResponse } from 'next/og'
import { NextRequest } from "next/server";

export const runtime = "edge";
type Channel = {
  id:string,
  name:string,
  handle:string,
  banner_url:string,
  icon_url:string,
}
export async function GET(req: NextRequest): Promise<Response | ImageResponse> {
  const { searchParams } = new URL(req.url);
  const ch_handle = searchParams.get("handle");
  
  const video = await fetch("https://api.tokuly.com/live/channel/get",{ cache: 'no-store',method: 'POST',  headers: {
    "Content-Type": "application/x-www-form-urlencoded"
  },
  body: "handle="+ch_handle});
  const live:Channel= await video.json();
  if (ch_handle) {
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
          <img style={{height: "100%",width: "100%",objectFit:'cover'}} src={live.icon_url} />
        </div>
      ),
      {
        width: 512,
        height: 512,
        emoji: "fluent",
      }
    );
  } else {
    return new Response(`Failed to generate the image`, {
      status: 400,
    });
  }
}