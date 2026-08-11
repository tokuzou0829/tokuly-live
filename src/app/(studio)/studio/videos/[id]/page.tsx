import { requireStudioContext } from "@/lib/studio-context";
import {
  getStudioContentClips,
  getStudioStream,
  getStudioSubtitles,
  getUploadSession,
} from "@/requests/studio";
import { notFound } from "next/navigation";
import ContentDeleteSection from "../../components/content-delete-section";
import StreamEditor from "../../components/stream-editor";
import StudioMonitor from "../../components/studio-monitor";
import SubtitleManager from "../../components/subtitle-manager";
import VideoUploader from "../../components/video-uploader";
import StudioClipList from "../../components/studio-clip-list";

export default async function VideoPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { clip_page?: string };
}) {
  const id = Number(params.id);
  if (!Number.isInteger(id)) notFound();
  const { token, channels } = await requireStudioContext();
  const stream = await getStudioStream(id, token);
  const ownsStream = channels.some((item) => Number(item.id) === Number(stream.channel_id));
  if (!ownsStream || stream.type !== "video") notFound();
  const clipPage = Math.max(1, Number(searchParams.clip_page) || 1);
  const [upload, subtitles, clips] = await Promise.all([
    getUploadSession(id, token),
    getStudioSubtitles(id, token).catch(() => ({ data: [], can_upload: false })),
    getStudioContentClips(stream.channel_id, token, {
      source_video_id: id,
      page: clipPage,
      per_page: 20,
    }),
  ]);
  const clipHref = (page: number) => `/studio/videos/${id}?clip_page=${page}`;
  return (
    <div className="space-y-6">
      <h1 className="studio-title">{stream.title}</h1>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(380px,.8fr)]">
        <div className="space-y-5">
          <StudioMonitor streamKey={stream.stream_key} />
          <VideoUploader streamId={id} token={token} initial={upload} />
          <SubtitleManager streamId={id} token={token} initial={subtitles} />
        </div>
        <StreamEditor stream={stream} token={token} />
      </div>
      <StudioClipList
        title="この動画のクリップ"
        result={clips}
        token={token}
        deleteChannelId={stream.channel_id}
        previousHref={clipPage > 1 ? clipHref(clipPage - 1) : undefined}
        nextHref={clipPage < clips.meta.last_page ? clipHref(clipPage + 1) : undefined}
      />
      <ContentDeleteSection stream={stream} token={token} />
    </div>
  );
}
