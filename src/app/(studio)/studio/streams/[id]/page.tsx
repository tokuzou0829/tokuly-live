import Chat from "@/app/(main)/live/[id]/chat";
import { auth } from "@/auth";
import { requireStudioContext } from "@/lib/studio-context";
import {
  getListenerAnalytics,
  getStudioContentClips,
  getStudioStream,
  getStudioSubtitles,
} from "@/requests/studio";
import { notFound } from "next/navigation";
import ContentDeleteSection from "../../components/content-delete-section";
import StudioAnalytics from "../../components/studio-analytics";
import StudioMonitor from "../../components/studio-monitor";
import StreamEditor from "../../components/stream-editor";
import SubtitleManager from "../../components/subtitle-manager";
import StudioClipList from "../../components/studio-clip-list";

export default async function StreamPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { clip_page?: string };
}) {
  const id = Number(params.id);
  if (!Number.isInteger(id)) notFound();
  const [{ token, channels }, session] = await Promise.all([requireStudioContext(), auth()]);
  const stream = await getStudioStream(id, token);
  const channel = channels.find((item) => Number(item.id) === Number(stream.channel_id));
  if (!channel || stream.type !== "live") notFound();
  const clipPage = Math.max(1, Number(searchParams.clip_page) || 1);
  const [analytics, subtitles, clips] = await Promise.all([
    getListenerAnalytics(id, token).catch(() => ({ summary: null, timeline: [] })),
    getStudioSubtitles(id, token).catch(() => ({ data: [], can_upload: false })),
    stream.status === "end"
      ? getStudioContentClips(stream.channel_id, token, {
          source_video_id: id,
          page: clipPage,
          per_page: 20,
        })
      : Promise.resolve(null),
  ]);

  if (stream.status === "end") {
    return (
      <div className="space-y-6">
        <h1 className="studio-title">{stream.title}</h1>
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(380px,.8fr)]">
          <div className="space-y-5">
            <StudioMonitor streamKey={stream.stream_key} />
            <StudioAnalytics streamId={id} token={token} initial={analytics} />
            <SubtitleManager streamId={id} token={token} initial={subtitles} />
          </div>
          <StreamEditor stream={stream} token={token} />
        </div>
        {clips && (
          <StudioClipList
            title="この動画のクリップ"
            result={clips}
            token={token}
            deleteChannelId={stream.channel_id}
            previousHref={
              clipPage > 1 ? `/studio/streams/${id}?clip_page=${clipPage - 1}` : undefined
            }
            nextHref={
              clipPage < clips.meta.last_page
                ? `/studio/streams/${id}?clip_page=${clipPage + 1}`
                : undefined
            }
          />
        )}
        <ContentDeleteSection stream={stream} token={token} />
      </div>
    );
  }

  return (
    <div className="grid min-w-0 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-5 xl:grid-cols-[minmax(0,1fr)_440px]">
      <div className="min-w-0 lg:col-start-1 lg:row-start-1">
        <StudioMonitor streamKey={stream.stream_key} />
      </div>
      <div className="h-[min(70dvh,600px)] min-h-[420px] min-w-0 overflow-hidden lg:sticky lg:top-16 lg:col-start-2 lg:row-start-1 lg:row-span-5 lg:-my-6 lg:h-[calc(100dvh-4rem)] lg:min-h-0 xl:-my-8 [&_.chat-body]:h-full [&_.chat-body]:min-h-0 [&_.chat-body]:max-h-none">
        <Chat
          id={id}
          channelId={channel.id}
          giftsEnabled={false}
          session={session}
          postingIdentityOverride={{
            channelId: channel.id,
            name: channel.name,
            image: channel.icon_url,
          }}
        />
      </div>
      <div className="min-w-0 lg:col-start-1 lg:row-start-2">
        <StudioAnalytics streamId={id} token={token} initial={analytics} />
      </div>
      <div className="min-w-0 lg:col-start-1 lg:row-start-3">
        <StreamEditor stream={stream} token={token} />
      </div>
      <div className="min-w-0 lg:col-start-1 lg:row-start-4">
        <SubtitleManager streamId={id} token={token} initial={subtitles} />
      </div>
      <div className="min-w-0 lg:col-start-1 lg:row-start-5">
        <ContentDeleteSection stream={stream} token={token} />
      </div>
    </div>
  );
}
