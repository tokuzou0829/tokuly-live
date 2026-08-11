import { requireStudioContext } from "@/lib/studio-context";
import { getStudioContentClips, getStudioCreatedClips } from "@/requests/studio";
import Link from "next/link";
import StudioClipList from "../components/studio-clip-list";

export const metadata = { title: "クリップ" };

export default async function StudioClipsPage({
  searchParams,
}: {
  searchParams: { view?: string; page?: string };
}) {
  const { token, channel } = await requireStudioContext();
  const view = searchParams.view === "on-content" ? "on-content" : "created";
  const page = Math.max(1, Number(searchParams.page) || 1);
  const result =
    view === "created"
      ? await getStudioCreatedClips(channel.id, token, { page, per_page: 20 })
      : await getStudioContentClips(channel.id, token, { page, per_page: 20 });
  const href = (value: number) => `/studio/clips?view=${view}&page=${value}`;

  return (
    <div className="space-y-6">
      <h1 className="studio-title">クリップ</h1>
      <div className="studio-card overflow-hidden p-3">
        <div className="flex gap-1 overflow-x-auto">
          {[
            ["created", "作成したクリップ"],
            ["on-content", "自分のコンテンツのクリップ"],
          ].map(([value, label]) => (
            <Link
              key={value}
              href={`/studio/clips?view=${value}`}
              className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold ${view === value ? "bg-[var(--studio-active)] text-[var(--studio-accent)]" : "hover:bg-[var(--studio-subtle)]"}`}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>
      <StudioClipList
        result={result}
        token={token}
        deleteChannelId={channel.id}
        previousHref={page > 1 ? href(page - 1) : undefined}
        nextHref={page < result.meta.last_page ? href(page + 1) : undefined}
      />
    </div>
  );
}
