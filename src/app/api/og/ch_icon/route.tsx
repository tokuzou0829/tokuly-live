import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { getChannel } from "@/requests/channel";

export const runtime = "edge";

export const revalidate = 0;

export async function GET(req: NextRequest): Promise<Response | ImageResponse> {
  const { searchParams } = new URL(req.url);
  const ch_handle = searchParams.get("handle");
  if (ch_handle) {
    const live = await getChannel({ handle: ch_handle });

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
            position: "relative",
          }}
        >
          <img
            style={{ height: "100%", width: "100%", objectFit: "cover" }}
            src={live.icon_url}
          />
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
