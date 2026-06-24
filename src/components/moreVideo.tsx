import { getMoreVideo } from "@/requests/live";
import { auth } from "@/auth";
import type { Live } from "@/types/live";
import { MoreVideoItem } from "@/components/moreVideoItem";

export async function MoreVideo({ stream }: { stream: Live }) {
  const [, videos] = await Promise.all([auth(), getMoreVideo({ id: stream.stream_name })]);

  if (!videos || videos.length === 0) {
    return null;
  }

  return (
    <section className="w-full">
      <p className="mb-3 text-[18px] font-bold leading-tight">{stream.ch_name} をもっと見る</p>
      <div className="space-y-2">
        {videos.map((video) => (
          <MoreVideoItem key={video.id} video={video} />
        ))}
      </div>
    </section>
  );
}
