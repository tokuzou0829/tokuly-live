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
          <div className="px-2 pt-2">
            <p className="mb-2 text-2xl font-bold leading-snug">{live.title}</p>
            <Link
              href={`/${live.ch_handle}`}
              className="flex w-fit max-w-full items-center gap-3 rounded-full py-1 pr-3 transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
            >
              <img
                src={live.ch_icon}
                alt={`${live.ch_name} icon`}
                className="h-11 w-11 flex-shrink-0 rounded-full object-cover ring-1 ring-slate-200"
              />
              <div className="min-w-0">
                <h2 className="truncate text-lg font-bold leading-tight text-slate-950">
                  {live.ch_name}
                </h2>
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
