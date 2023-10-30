import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
export const runtime = "edge";

type Games = {
  "id": number,
  "cover": {
    "id": number,
    "url": string,
  },
  "name": string,
}
export const corsHeaders = {
  "Access-Control-Allow-Origin": "https://tokuly.com",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};
export async function GET(req: NextRequest): Promise<Response | NextResponse>{
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q");
    const response = await fetch(`https://api.igdb.com/v4/games`, {
      method: 'POST',
      headers: {
        'Client-ID': '',
        'Authorization': ``,
      },
      body: `fields name,cover.url; search "${q}";`,
    });
    let data:Games[] = await response.json();
      // 高解像度の画像を取得するために画像URLを修正
    data = data.map(game => {
      if (game.cover) {
        game.cover.url = "https:"+game.cover.url.replace('t_thumb', 't_1080p');
      }
      return game;
    });
    return NextResponse.json(data,{ status: 200, headers: corsHeaders });
};
  