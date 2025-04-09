import "./tokuly-livestyle.css";
import TopLive from "./toplive";
import Link from "next/link";
import Live from "@/components/ui/live";
import Video from "@/components/ui/video";
import { getOnlineLiveList,getArchivesList } from "@/requests/live";

export const revalidate = 0;

export default async function Home() {
  const lives = await getOnlineLiveList();
  const archives = await getArchivesList();

  return (
    <div>
      {(lives.lives.length === 0 && archives.archives.length === 0) ? (
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
          <p className=" text-[20px] m-[10px] font-bold">おすすめのコンテンツ</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 justify-center px-4">
            {lives.lives.map((live, index) => (
              <Live key={index} live={live}></Live>
            ))}
            {archives.archives.map((live, index) => (
              <Video key={index} live={live}></Video>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
