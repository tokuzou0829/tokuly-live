import { auth } from "@/auth";
import ClipCard from "@/components/clip-card";
import { Button } from "@/components/ui/button";
import { getVideoClips } from "@/requests/clips";
import { getLive, VideoCheck } from "@/requests/live";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { id: string } }) {
  const live = await getLive({ id: params.id });
  return { title: `${live.title}のクリップ` };
}

export default async function VideoClipsPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { page?: string };
}) {
  const [, live, session] = await Promise.all([
    VideoCheck({ id: params.id }),
    getLive({ id: params.id }),
    auth(),
  ]);
  const page = Math.max(1, Number(searchParams.page) || 1);
  const result = await getVideoClips(live.id, {
    page,
    perPage: 20,
    token: session?.user?.access_token,
  });
  const pageHref = (value: number) =>
    `/video/${encodeURIComponent(live.stream_name)}/clips?page=${value}`;

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8">
      <Link
        href={`/video/${encodeURIComponent(live.stream_name)}`}
        className="mb-5 inline-flex items-center text-sm font-semibold text-slate-600 hover:text-slate-950"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        元の動画へ戻る
      </Link>
      <div className="flex items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold">この動画のクリップ</h1>
          <p className="mt-1 truncate text-sm text-muted-foreground">{live.title}</p>
        </div>
        <span className="shrink-0 text-sm text-muted-foreground">{result.meta.total}件</span>
      </div>

      {result.data.length === 0 ? (
        <p className="mt-8 rounded-xl bg-slate-100 p-10 text-center text-sm text-slate-600">
          この動画のクリップはまだありません。
        </p>
      ) : (
        <div className="mt-6 grid gap-x-4 gap-y-7 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {result.data.map((clip) => (
            <ClipCard key={clip.clip_key} clip={clip} />
          ))}
        </div>
      )}

      {result.meta.last_page > 1 && (
        <nav className="mt-10 flex items-center justify-center gap-3" aria-label="ページ移動">
          <Button asChild variant="outline" size="sm">
            <Link
              aria-disabled={page <= 1}
              className={page <= 1 ? "pointer-events-none opacity-50" : ""}
              href={pageHref(Math.max(1, page - 1))}
            >
              前へ
            </Link>
          </Button>
          <span className="text-sm">
            {page} / {result.meta.last_page}
          </span>
          <Button asChild variant="outline" size="sm">
            <Link
              aria-disabled={page >= result.meta.last_page}
              className={page >= result.meta.last_page ? "pointer-events-none opacity-50" : ""}
              href={pageHref(Math.min(result.meta.last_page, page + 1))}
            >
              次へ
            </Link>
          </Button>
        </nav>
      )}
    </main>
  );
}
