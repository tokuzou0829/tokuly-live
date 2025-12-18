import { getMoreVideo } from "@/requests/live";
import { auth } from "@/auth";
import { Live } from "@/types/live";
import Link from "next/link";
export async function MoreVideo({ stream }: { stream: Live }) {
  const [session, videos] = await Promise.all([auth(), getMoreVideo({ id: stream.stream_name })]);
  return (
    <>
      <div className="w-[100%]">
        <p className=" font-bold text-[20px]">{stream.ch_name} をもっと見る</p>
        {videos &&
          videos.map((video, index) => (
            <div key={index}>
              <Link href={`/${video.type == "live" ? "live" : "video"}/${video.stream_name}`}>
                <div className="flex items-center my-[5px]">
                  <img
                    className="object-cover w-[140px] aspect-video rounded"
                    src={video.thumbnail_url}
                  ></img>
                  <div className="ml-2 mr-2">
                    <span className="text-ellipsis-2">{video.title}</span>
                  </div>
                </div>
              </Link>
            </div>
          ))}
      </div>
    </>
  );
}
