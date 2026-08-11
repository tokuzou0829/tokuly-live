import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { ClipApiError, getClip } from "@/requests/clips";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import ClipPlayer from "./clip-player";
import ClipSourceLink from "./clip-source-link";

export const dynamic = "force-dynamic";
const SITE_URL = "https://live.tokuly.com";

async function loadClip(clipKey: string) {
  const session = await auth();
  try {
    return { clip: await getClip(clipKey, session?.user?.access_token), session, error: null };
  } catch (caught) {
    if (caught instanceof ClipApiError && caught.status === 404) notFound();
    return { clip: null, session, error: caught };
  }
}

export async function generateMetadata({
  params,
}: {
  params: { clip_key: string };
}): Promise<Metadata> {
  const { clip } = await loadClip(params.clip_key);
  if (!clip) return { title: "クリップ" };
  const pageUrl = `${SITE_URL}/clip/${encodeURIComponent(clip.clip_key)}`;
  return {
    title: clip.title,
    description: `${clip.creator_channel.name}が作成した「${clip.source_video.title}」のクリップ`,
    alternates: { canonical: pageUrl },
    twitter: { card: "summary_large_image", title: clip.title, images: [clip.thumbnail_url] },
    openGraph: {
      title: clip.title,
      description: `${clip.creator_channel.name}が作成したクリップ`,
      url: pageUrl,
      type: "video.other",
      images: [{ url: clip.thumbnail_url, alt: clip.title }],
    },
  };
}

export default async function ClipPage({ params }: { params: { clip_key: string } }) {
  const { clip, session, error } = await loadClip(params.clip_key);
  if (!clip) {
    const unauthenticated =
      error instanceof ClipApiError &&
      (error.status === 401 || error.status === 403) &&
      !session?.user;
    return (
      <main className="mx-auto flex min-h-[60dvh] max-w-xl items-center px-4 py-12 text-center">
        <div className="w-full rounded-xl border bg-white p-8">
          <h1 className="text-xl font-bold">
            {unauthenticated ? "ログインが必要です" : "このクリップは閲覧できません"}
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            {unauthenticated
              ? "公開範囲を確認するため、Tokulyへログインしてください。"
              : error instanceof Error
                ? error.message
                : "時間をおいてもう一度お試しください。"}
          </p>
          <Button asChild className="mt-6">
            <Link
              href={
                unauthenticated
                  ? `/api/auth/signin?callbackUrl=${encodeURIComponent(`/clip/${params.clip_key}`)}`
                  : "/"
              }
            >
              {unauthenticated ? "ログイン" : "ホームへ戻る"}
            </Link>
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6">
      <ClipPlayer clip={clip}>
        <div className="mt-5">
          <h1 className="text-2xl font-bold leading-snug">{clip.title}</h1>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
            <Link
              href={`/${clip.creator_channel.handle}`}
              className="flex min-w-0 items-center gap-3 hover:opacity-80"
            >
              {clip.creator_channel.icon_url ? (
                <img
                  src={clip.creator_channel.icon_url}
                  alt=""
                  className="h-11 w-11 rounded-full object-cover"
                />
              ) : (
                <div className="h-11 w-11 rounded-full bg-slate-200" />
              )}
              <div className="min-w-0">
                <p className="truncate font-semibold">{clip.creator_channel.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  @{clip.creator_channel.handle}
                </p>
              </div>
            </Link>
            <span className="text-sm text-muted-foreground">
              {new Date(clip.created_at).toLocaleString("ja-JP")}
            </span>
          </div>
          <div className="mt-5 rounded-xl bg-slate-100 p-4">
            <p className="text-xs font-semibold text-slate-500">元の動画</p>
            <ClipSourceLink clip={clip} className="mt-2 flex items-center gap-3 hover:opacity-80">
              {clip.source_video.thumbnail_url && (
                <img
                  src={clip.source_video.thumbnail_url}
                  alt=""
                  className="aspect-video w-28 rounded-lg bg-black object-cover"
                />
              )}
              <div className="min-w-0">
                <p className="line-clamp-2 font-semibold">{clip.source_video.title}</p>
                <p className="mt-1 truncate text-xs text-muted-foreground">
                  {clip.source_channel.name}
                </p>
              </div>
            </ClipSourceLink>
          </div>
        </div>
      </ClipPlayer>
    </main>
  );
}
