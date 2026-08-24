import { requireStudioContext } from "@/lib/studio-context";
import { resolveAnalyticsMonth } from "@/lib/view-analytics";
import { getClip } from "@/requests/clips";
import { getStudioClipViewAnalytics } from "@/requests/studio";
import { notFound } from "next/navigation";
import StudioViewAnalytics from "../../components/studio-view-analytics";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import Link from "next/link";

export default async function StudioClipAnalyticsPage({
  params,
  searchParams,
}: {
  params: { clipKey: string };
  searchParams: { month?: string };
}) {
  const { token } = await requireStudioContext();
  const month = resolveAnalyticsMonth(searchParams.month);
  const [clip, analytics] = await Promise.all([
    getClip(params.clipKey, token).catch(() => null),
    getStudioClipViewAnalytics(params.clipKey, token, month).catch(() => null),
  ]);
  if (!clip && !analytics) notFound();
  const title = clip?.title ?? `クリップ ${params.clipKey}`;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="studio-title break-words">{title}</h1>
        <Button asChild variant="outline">
          <Link href={`/clip/${encodeURIComponent(params.clipKey)}`} target="_blank">
            公開ページを表示 <ExternalLink className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>
      <StudioViewAnalytics
        analytics={analytics}
        basePath={`/studio/clips/${encodeURIComponent(params.clipKey)}`}
        token={token}
        title="クリップの再生数"
      />
    </div>
  );
}
