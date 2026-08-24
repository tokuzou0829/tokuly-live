import Video from "./videoframe";
import Chat from "./chat";
import WatchWithFriendView from "./watchWithFriendView";
import { auth } from "@/auth";
import LiveOverview from "./liveOverview";
import { getLive } from "@/requests/live";
import Link from "next/link";
import { MoreVideo } from "@/components/moreVideo";
import { StreamComments } from "@/components/stream-comments";
import { getChannel } from "@/requests/channel";
import { ArchivePlaybackProvider } from "./archive-playback-context";
import ClipCreator from "./clip-creator";
import { getVideoClips } from "@/requests/clips";
import StreamReactionButtons from "@/components/stream-reaction-buttons";
interface LiveProps {
  id: string;
}

export const revalidate = 180;

export default async function LivePlayer({ id }: LiveProps) {
  const [session, live] = await Promise.all([auth(), getLive({ id })]);
  const [channel, clips] = await Promise.all([
    getChannel({ handle: live.ch_handle }),
    getVideoClips(live.id, {
      perPage: 6,
      token: session?.user?.access_token,
    }).catch(() => null),
  ]);

  return (
    <ArchivePlaybackProvider
      initialViewCount={typeof live.view_count === "number" ? live.view_count + 1 : undefined}
    >
      <div className="w-[100%] overflow-hidden">
        <div className="xl:grid xl:grid-cols-[minmax(0,1fr)_430px] xl:items-start">
          <div className="min-w-0 px-4 pt-3 xl:pr-3">
            <div id="clip-mobile-stage">
              <div id="clip-mobile-player">
                <Video live={live} />
              </div>
              <div id="clip-mobile-editor-slot" />
            </div>
            <div className="pt-2">
              <p className="mb-2 text-2xl font-bold leading-snug">{live.title}</p>
              <div className="flex flex-wrap items-center justify-between gap-3">
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
                <div className="ml-auto flex min-w-0 max-w-full flex-nowrap items-center gap-2 overflow-x-auto overscroll-x-contain">
                  <StreamReactionButtons
                    streamId={live.id}
                    initialLikeCount={live.like_count}
                    initialDislikeCount={live.dislike_count}
                  />
                  <ClipCreator live={live} />
                </div>
              </div>
              <LiveOverview live={live} clips={clips} />
            </div>
          </div>
          <div className="max-w-[100%] p-4 xl:col-start-2 xl:row-span-2 xl:row-start-1 xl:pl-3 xl:pr-5">
            <div>
              <div id="clip-editor-slot" className="mb-4 hidden empty:mb-0 xl:block" />
              {live.status !== "video" && <Chat id={live.id} />}
              {live.status == "video" && (
                <WatchWithFriendView id={live.id} session={session}></WatchWithFriendView>
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
    </ArchivePlaybackProvider>
  );
}
