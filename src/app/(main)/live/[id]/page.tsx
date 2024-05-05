import Live from "./Live";
import { onlineCheck, getLive } from "@/requests/live";

export const revalidate = 0;

export async function generateMetadata({ params }: { params: { id: string } }) {
  const live = await getLive({ id: params.id });

  return {
    title: live.title,
    description: live.stream_overview,
    keywords: ["ライブ配信"],
    twitter: {
      card: "summary_large_image",
      images: ["https://live.tokuly.com/api/og?video_id=" + params.id],
    },
    openGraph: {
      title: live.title,
      description: live.stream_overview,
      url: "https://live.tokuly.com/live/" + params.id,
      siteName: "Tokuly Live",
      images: {
        url: "https://live.tokuly.com/api/og?video_id=" + params.id,
        width: 1200,
        height: 630,
      },
    },
  };
}
export default async function LivePage({ params }: { params: { id: string } }) {
  await onlineCheck({ id: params.id });

  return <Live id={params.id} />;
}
