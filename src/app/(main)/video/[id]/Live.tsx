import Video from "./videoframe";
import Chat from "./chat";
import WatchWithFriendView from "./watchWithFriendView";
import { auth } from "@/auth";
import LiveOverview from "./liveOverview";
import { getLive } from "@/requests/live";
import Link from "next/link";
import { MoreVideo } from "@/components/moreVideo";
interface LiveProps {
  id: string;
}

export const revalidate = 180;

export default async function LivePlayer({ id }: LiveProps) {
  const [session, live] = await Promise.all([auth(), getLive({ id })]);

  return (
    <div className="w-[100%] overflow-hidden">
      <div className="xl:flex">
        <div className="w-full">
          <Video live={live} />
          <div className="px-2">
            <p className="mt-[5px] mb-[5px] text-2xl font-bold ">{live.title}</p>
            <Link href={`/${live.ch_handle}`}>
              <div className="flex items-center bg-slate-100 p-2 rounded-lg">
                <img
                  src={live.ch_icon}
                  alt={`${live.ch_name} icon`}
                  className="w-12 h-12 rounded-full object-cover flex-shrink-0 mr-1"
                />
                <div className="flex flex-col justify-center">
                  <h2 className="font-bold text-xl leading-tight">{live.ch_name}</h2>
                </div>
              </div>
            </Link>
            <LiveOverview live={live} />
          </div>
        </div>
        <div className="p-[10px] xl:min-w-[430px] max-w-[100%] xl:max-w-[430px] xl:pr-[20px]">
          <div>
            {live.status !== "video" && <Chat id={live.id} session={session}></Chat>}
            {live.status == "video" && (
              <WatchWithFriendView id={live.id} session={session}></WatchWithFriendView>
            )}
            <MoreVideo stream={live}></MoreVideo>
          </div>
        </div>
      </div>
    </div>
  );
}
