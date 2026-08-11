import "./tokuly-livestyle.css";
import TopLive from "./toplive";
import Link from "next/link";
import Live from "@/components/ui/live";
import Video from "@/components/ui/video";
import { getOnlineLiveList, getRecommendVideo } from "@/requests/live";
import { getLatestClips } from "@/requests/clips";
import HomeRecommendedClips from "@/components/home-recommended-clips";

export const revalidate = 0;

export default async function Home() {
  const [lives, archives, clips] = await Promise.all([
    getOnlineLiveList(),
    getRecommendVideo(),
    getLatestClips({ perPage: 10 }).catch(() => null),
  ]);
  const recommendedContent = [
    ...lives.lives.map((live) => ({ kind: "live" as const, live })),
    ...archives.archives.map((live) => ({ kind: "video" as const, live })),
  ];
  const recommendedClips = clips?.data ?? [];
  const hasContent = recommendedContent.length > 0 || recommendedClips.length > 0;

  const renderContent = (item: (typeof recommendedContent)[number]) =>
    item.kind === "live" ? (
      <Live key={`live-${item.live.stream_name}`} live={item.live} className="mr-0 w-full shrink" />
    ) : (
      <Video
        key={`video-${item.live.stream_name}`}
        live={item.live}
        className="mr-0 w-full shrink"
      />
    );

  return (
    <div>
      {!hasContent ? (
        <>
          <p
            style={{
              fontSize: 20,
              textAlign: "center",
              marginTop: 20,
              marginBottom: 5,
            }}
          >
            まだ配信は行われていないようです
          </p>
          <Link
            style={{
              display: "block",
              fontSize: 20,
              textAlign: "center",
              marginTop: 0,
              textDecoration: "underline",
            }}
            href="https://tokuly.com/studio"
            target="_blank"
          >
            配信を始める！
          </Link>
        </>
      ) : (
        <>
          {lives.lives.length > 0 && <TopLive lives={lives.lives} />}
          <div className="mt-3 px-4 pb-8 sm:px-6 lg:px-8">
            {recommendedContent.length > 0 && (
              <>
                <div>
                  <p className="mb-3 text-[20px] font-bold">おすすめのコンテンツ</p>
                </div>
                <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,220px),1fr))] gap-x-5 gap-y-7 sm:grid-cols-[repeat(auto-fill,minmax(250px,1fr))] lg:grid-cols-[repeat(auto-fill,minmax(270px,1fr))] 2xl:grid-cols-[repeat(auto-fill,minmax(290px,1fr))]">
                  {recommendedContent.map(renderContent)}
                  {recommendedClips.length > 0 && (
                    <div className="col-span-full row-start-3 -mx-4 w-[calc(100%+2rem)] sm:-mx-6 sm:w-[calc(100%+3rem)] lg:-mx-8 lg:w-[calc(100%+4rem)]">
                      <HomeRecommendedClips clips={recommendedClips} />
                    </div>
                  )}
                </div>
              </>
            )}

            {recommendedContent.length === 0 && <HomeRecommendedClips clips={recommendedClips} />}
          </div>
        </>
      )}
    </div>
  );
}
