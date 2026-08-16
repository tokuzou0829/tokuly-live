import { Button } from "@/components/ui/button";
import { requireStudioContext } from "@/lib/studio-context";
import { getReceivedGifts } from "@/requests/studio";
import { ExternalLink } from "lucide-react";
import Link from "next/link";
import GiftAction from "../components/gift-action";
export const metadata = { title: "ギフト" };
export default async function GiftsPage({ searchParams }: { searchParams: { page?: string } }) {
  const { token } = await requireStudioContext();
  const page = Math.max(1, Number(searchParams.page) || 1);
  const result = await getReceivedGifts(token, page);
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="studio-title">受け取ったギフト</h1>
          <p className="mt-2 text-sm text-[var(--studio-muted)]">
            チャンネルに届いたギフトの受取状況を管理できます。
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/gifts">
            送ったギフトを見る
            <ExternalLink className="ml-2 h-4 w-4" aria-hidden="true" />
          </Link>
        </Button>
      </div>
      <section className="studio-card overflow-hidden">
        <div className="divide-y divide-[var(--studio-border)]">
          {result.data.map((gift) => (
            <div key={gift.id} className="flex flex-wrap items-center gap-4 p-5">
              <div className="min-w-0 flex-1">
                <p className="font-semibold">
                  {gift.sender.name}{" "}
                  <span className="text-sm font-normal text-[var(--studio-muted)]">
                    @{gift.sender.handle}
                  </span>
                </p>
                <p className="mt-1 text-sm">{gift.comment || "コメントなし"}</p>
                <p className="mt-2 text-xs text-[var(--studio-muted)]">
                  {new Date(gift.received_at).toLocaleString("ja-JP")}
                </p>
              </div>
              <p className="text-xl font-bold">¥{gift.amount.toLocaleString()}</p>
              <div className="flex items-center gap-3">
                {gift.accessed_at && (
                  <span className="text-sm text-[var(--studio-muted)]">アクセス済み</span>
                )}
                <GiftAction
                  id={gift.id}
                  token={token}
                  type="claim"
                  accessed={Boolean(gift.accessed_at)}
                />
              </div>
            </div>
          ))}
          {result.data.length === 0 && (
            <p className="p-12 text-center text-sm text-[var(--studio-muted)]">
              受け取ったギフトはありません
            </p>
          )}
        </div>
        {result.meta.last_page > 1 && (
          <div className="flex items-center justify-end gap-2 border-t border-[var(--studio-border)] p-4">
            <Button asChild variant="outline" size="sm">
              <Link href={`/studio/gifts?page=${Math.max(1, page - 1)}`}>前へ</Link>
            </Button>
            <span className="text-sm">
              {page} / {result.meta.last_page}
            </span>
            <Button asChild variant="outline" size="sm">
              <Link href={`/studio/gifts?page=${Math.min(result.meta.last_page, page + 1)}`}>
                次へ
              </Link>
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}
