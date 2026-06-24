import "./tokuly-livestyle.css";
import TopLive from "./toplive";
import Link from "next/link";
import Live from "@/components/ui/live";
import Video from "@/components/ui/video";
import { getOnlineLiveList, getRecommendVideo } from "@/requests/live";

export const revalidate = 0;

export default async function Home() {
  const lives = await getOnlineLiveList();
  const archives = await getRecommendVideo();

  return (
    <div>
      {lives.lives.length === 0 && archives.archives.length === 0 ? (
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
          <TopLive lives={lives.lives}></TopLive>
          <section className="mt-3 px-3 pb-8 sm:px-4">
            <p className="mb-3 text-[20px] font-bold">おすすめのコンテンツ</p>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,180px),1fr))] gap-x-4 gap-y-6 sm:grid-cols-[repeat(auto-fill,minmax(200px,1fr))] lg:grid-cols-[repeat(auto-fill,minmax(220px,1fr))] 2xl:grid-cols-[repeat(auto-fill,minmax(230px,1fr))]">
              {lives.lives.map((live, index) => (
                <Live key={index} live={live} className="mr-0 w-full shrink" />
              ))}
              {archives.archives.map((live, index) => (
                <Video key={index} live={live} className="mr-0 w-full shrink" />
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
