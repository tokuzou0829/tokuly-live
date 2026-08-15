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
import StreamReactionButtons from "@/components/stream-reaction-buttons";

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
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex min-w-0 items-center">
                  <div className="relative h-[85px] w-[85px] shrink-0">
                    <img
                      src={live.ch_icon}
                      alt={`${live.ch_name} icon`}
                      className="m-[2.5px] mt-0 aspect-square h-[80px] w-[80px] min-w-[80px] rounded-full object-cover"
                    />
                    <div className="absolute bottom-0 left-0 h-[25px] w-[85px] rounded-md bg-red-600">
                      <p className="text-center font-semibold text-white">ライブ配信</p>
                    </div>
                  </div>
                  <div className="min-w-0">
                    <p className="mb-0 truncate text-xl font-bold">{live.ch_name}</p>
                    <Viewer />
                  </div>
                </div>
                <StreamReactionButtons
                  streamId={live.id}
                  initialLikeCount={live.like_count}
                  initialDislikeCount={live.dislike_count}
                />
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
              streamChannelId={Number(channel.id)}
              creatorName={live.ch_name}
              creatorIconUrl={live.ch_icon}
            />
          </div>
        </div>
      </div>
    </ListenerAnalyticsProvider>
  );
}
