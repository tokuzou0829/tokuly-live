import Video from "./videoframe";
import Viewer from "./viewer";
import Chat from "./chat";
import { auth } from "@/auth";
import LiveOverview from "./liveOverview";
import { getLive } from "@/requests/live";
import { MoreVideo } from "@/components/moreVideo";
import { getChannel } from "@/requests/channel";
import { StreamComments } from "@/components/stream-comments";
import { ListenerAnalyticsProvider } from "./listener-analytics";

interface LiveProps {
  id: string;
}

export const revalidate = 180;

export default async function LivePlayer({ id }: LiveProps) {
  const [session, live] = await Promise.all([auth(), getLive({ id })]);
  const channel = await getChannel({ handle: live.ch_handle });

  return (
    <ListenerAnalyticsProvider session={session} streamId={live.id}>
      <div className="w-[100%] overflow-hidden">
        <div className="xl:grid xl:grid-cols-[minmax(0,1fr)_430px] xl:items-start">
          <div className="min-w-0 px-4 pt-3 xl:pr-3">
            <div className="overflow-hidden rounded-lg">
              <Video live={live} />
            </div>
            <div className="pt-2">
              <p className="mt-0 text-2xl font-bold">{live.title}</p>
              <div className="flex w-[100%]">
                <div className="relative w-[85px] h-[85px]">
                  <img
                    src={live.ch_icon}
                    className="w-[80px] h-[80px] rounded-full aspect-square m-[auto] object-cover flex-shrink-0 min-w-[80px] m-[2.5px] mt-[0px]"
                  />
                  <div className="absolute bg-red-600 w-[85px] h-[25px] bottom-[0px] left-[0px] rounded-md">
                    <p className=" text-white text-center font-semibold">ライブ配信</p>
                  </div>
                </div>
                <div>
                  <p className="font-bold mb-0 text-xl">{live.ch_name}</p>
                  <Viewer />
                </div>
              </div>
              <LiveOverview live={live} />
            </div>
          </div>
          <div className="max-w-[100%] p-4 xl:col-start-2 xl:row-span-2 xl:row-start-1 xl:pl-3 xl:pr-5">
            <div>
              {live.status !== "video" && (
                <>
                  <Chat
                    id={live.id}
                    channelId={Number(channel.id)}
                    giftsEnabled={live.gifts_enabled}
                    session={session}
                  ></Chat>
                  <div className="mb-2" />
                </>
              )}
              <MoreVideo stream={live}></MoreVideo>
            </div>
          </div>
          <div className="min-w-0 px-4 xl:col-start-1 xl:row-start-2 xl:pr-3">
            <StreamComments
              streamId={live.id}
              session={session}
              isChannelOwner={Number(session?.user?.id) === Number(channel.id)}
            />
          </div>
        </div>
      </div>
    </ListenerAnalyticsProvider>
  );
}
