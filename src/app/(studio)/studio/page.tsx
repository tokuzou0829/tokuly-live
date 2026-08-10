import Chat from "@/app/(main)/live/[id]/chat";
import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { requireStudioContext } from "@/lib/studio-context";
import { getListenerAnalytics, getStudioStreams } from "@/requests/studio";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import StudioCreateMenu from "./components/studio-create-menu";
import StudioAnalytics from "./components/studio-analytics";
import StudioMonitor from "./components/studio-monitor";
import StreamStatus from "./components/stream-status";

export const metadata = { title: "ダッシュボード" };

export default async function StudioDashboard() {
  const [{ token, channel }, session] = await Promise.all([requireStudioContext(), auth()]);
  const page = await getStudioStreams(channel.id, token, { per_page: 20 });
  const active =
    page.data.find((stream) => stream.status === "online") ??
    page.data.find((stream) => stream.status === "offline");
  const analytics = active
    ? await getListenerAnalytics(active.id, token).catch(() => ({ summary: null, timeline: [] }))
    : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="studio-title">ダッシュボード</h1>
        <StudioCreateMenu />
      </div>

      {active && analytics && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">{active.title}</h2>
            <Button asChild variant="outline" size="sm">
              <Link href={`/studio/streams/${active.id}`}>
                コントロールルーム <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_400px] xl:grid-cols-[minmax(0,1fr)_420px]">
            <div className="space-y-4">
              <StudioMonitor streamKey={active.stream_key} />
              <StudioAnalytics streamId={active.id} token={token} initial={analytics} />
            </div>
            <div className="min-h-[520px] lg:sticky lg:top-20 lg:h-[calc(100vh-6rem)] [&_.chat-body]:h-full [&_.chat-body]:max-h-none">
              <Chat
                id={active.id}
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
          </div>
        </section>
      )}

      <section className="studio-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-[var(--studio-border)] p-5">
          <h2 className="font-bold">最近のコンテンツ</h2>
          <Link
            href="/studio/content"
            className="text-sm font-semibold text-[var(--studio-accent)]"
          >
            すべて表示
          </Link>
        </div>
        <div className="divide-y divide-[var(--studio-border)]">
          {page.data.slice(0, 6).map((stream) => (
            <Link
              key={stream.id}
              href={
                stream.type === "video"
                  ? `/studio/videos/${stream.id}`
                  : `/studio/streams/${stream.id}`
              }
              className="grid grid-cols-[112px_minmax(0,1fr)_auto] items-center gap-4 p-4 hover:bg-[var(--studio-subtle)]"
            >
              <div className="relative aspect-video overflow-hidden rounded-lg bg-black">
                {stream.thumbnail_url && (
                  <img
                    src={stream.thumbnail_url}
                    alt=""
                    className="absolute inset-0 block h-full w-full object-cover object-center"
                  />
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate font-semibold">{stream.title}</p>
                <p className="mt-1 text-xs text-[var(--studio-muted)]">
                  {new Date(stream.created_at).toLocaleString("ja-JP")}
                </p>
              </div>
              <StreamStatus status={stream.status} />
            </Link>
          ))}
          {page.data.length === 0 && (
            <p className="p-8 text-center text-sm text-[var(--studio-muted)]">
              コンテンツはまだありません
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
