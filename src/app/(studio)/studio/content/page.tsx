import { Button } from "@/components/ui/button";
import { requireStudioContext } from "@/lib/studio-context";
import { getStudioStreams } from "@/requests/studio";
import Link from "next/link";
import StudioCreateMenu from "../components/studio-create-menu";
import StreamStatus from "../components/stream-status";

export const metadata = { title: "コンテンツ" };

export default async function ContentPage({
  searchParams,
}: {
  searchParams: { type?: string; page?: string };
}) {
  const { token, channel } = await requireStudioContext();
  const type =
    searchParams.type === "live" || searchParams.type === "video" ? searchParams.type : undefined;
  const pageNumber = Math.max(1, Number(searchParams.page) || 1);
  const result = await getStudioStreams(channel.id, token, {
    type,
    page: pageNumber,
    per_page: 20,
  });
  const href = (page: number) =>
    `/studio/content?${new URLSearchParams({ ...(type ? { type } : {}), page: String(page) })}`;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="studio-title">コンテンツ</h1>
        <StudioCreateMenu />
      </div>
      <div className="studio-card overflow-hidden">
        <div className="flex gap-1 overflow-x-auto border-b border-[var(--studio-border)] p-3">
          {[
            ["", "すべて"],
            ["live", "ライブ"],
            ["video", "動画"],
          ].map(([value, label]) => (
            <Link
              key={value}
              href={`/studio/content${value ? `?type=${value}` : ""}`}
              className={`rounded-lg px-4 py-2 text-sm font-semibold ${type === (value || undefined) ? "bg-[var(--studio-active)] text-[var(--studio-accent)]" : "hover:bg-[var(--studio-subtle)]"}`}
            >
              {label}
            </Link>
          ))}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="bg-[var(--studio-subtle)] text-xs text-[var(--studio-muted)]">
              <tr>
                <th className="px-4 py-3">コンテンツ</th>
                <th className="px-4 py-3">種類</th>
                <th className="px-4 py-3">公開設定</th>
                <th className="px-4 py-3">状態</th>
                <th className="px-4 py-3">作成日時</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--studio-border)]">
              {result.data.map((stream) => (
                <tr key={stream.id} className="hover:bg-[var(--studio-subtle)]">
                  <td className="p-3">
                    <Link
                      href={
                        stream.type === "video"
                          ? `/studio/videos/${stream.id}`
                          : `/studio/streams/${stream.id}`
                      }
                      className="flex items-center gap-3"
                    >
                      <div className="relative aspect-video w-28 shrink-0 overflow-hidden rounded-lg bg-black">
                        {stream.thumbnail_url && (
                          <img
                            src={stream.thumbnail_url}
                            alt=""
                            className="absolute inset-0 block h-full w-full object-cover object-center"
                          />
                        )}
                      </div>
                      <span className="max-w-md truncate font-semibold">{stream.title}</span>
                    </Link>
                  </td>
                  <td className="px-4 py-3">{stream.type === "video" ? "動画" : "ライブ"}</td>
                  <td className="px-4 py-3">{stream.publishing_setting}</td>
                  <td className="px-4 py-3">
                    <StreamStatus status={stream.status} />
                  </td>
                  <td className="px-4 py-3 text-[var(--studio-muted)]">
                    {new Date(stream.created_at).toLocaleDateString("ja-JP")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {result.data.length === 0 && (
          <p className="p-12 text-center text-sm text-[var(--studio-muted)]">
            該当するコンテンツはありません
          </p>
        )}
        {result.meta.last_page > 1 && (
          <div className="flex items-center justify-end gap-2 border-t border-[var(--studio-border)] p-4">
            <Button asChild variant="outline" size="sm">
              <Link aria-disabled={pageNumber <= 1} href={href(Math.max(1, pageNumber - 1))}>
                前へ
              </Link>
            </Button>
            <span className="text-sm">
              {pageNumber} / {result.meta.last_page}
            </span>
            <Button asChild variant="outline" size="sm">
              <Link
                aria-disabled={pageNumber >= result.meta.last_page}
                href={href(Math.min(result.meta.last_page, pageNumber + 1))}
              >
                次へ
              </Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
