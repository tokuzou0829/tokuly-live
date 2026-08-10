import { Button } from "@/components/ui/button";
import { requireStudioContext } from "@/lib/studio-context";
import { getReceivedGifts, getSentGifts } from "@/requests/studio";
import Link from "next/link";
import GiftAction from "../components/gift-action";
export const metadata = { title: "ギフト" };
export default async function GiftsPage({
  searchParams,
}: {
  searchParams: { tab?: string; page?: string };
}) {
  const { token } = await requireStudioContext();
  const tab = searchParams.tab === "sent" ? "sent" : "received";
  const page = Math.max(1, Number(searchParams.page) || 1);
  const result =
    tab === "sent" ? await getSentGifts(token, page) : await getReceivedGifts(token, page);
  return (
    <div className="space-y-6">
      <h1 className="studio-title">ギフト</h1>
      <section className="studio-card overflow-hidden">
        <div className="flex border-b border-[var(--studio-border)] p-3">
          <Link
            href="/studio/gifts"
            className={`rounded-lg px-4 py-2 text-sm font-semibold ${tab === "received" ? "bg-[var(--studio-active)] text-[var(--studio-accent)]" : ""}`}
          >
            受け取ったギフト
          </Link>
          <Link
            href="/studio/gifts?tab=sent"
            className={`rounded-lg px-4 py-2 text-sm font-semibold ${tab === "sent" ? "bg-[var(--studio-active)] text-[var(--studio-accent)]" : ""}`}
          >
            送ったギフト
          </Link>
        </div>
        <div className="divide-y divide-[var(--studio-border)]">
          {tab === "received"
            ? (result.data as Awaited<ReturnType<typeof getReceivedGifts>>["data"]).map((gift) => (
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
                  {gift.accessed_at ? (
                    <span className="text-sm text-[var(--studio-muted)]">受取済み</span>
                  ) : (
                    <GiftAction id={gift.id} token={token} type="claim" />
                  )}
                </div>
              ))
            : (result.data as Awaited<ReturnType<typeof getSentGifts>>["data"]).map((gift) => (
                <div key={gift.id} className="flex flex-wrap items-center gap-4 p-5">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{gift.recipient_channel.name}</p>
                    <p className="mt-1 text-sm text-[var(--studio-muted)]">
                      {gift.status}・{new Date(gift.created_at).toLocaleString("ja-JP")}
                    </p>
                  </div>
                  <p className="text-xl font-bold">¥{gift.expected_amount.toLocaleString()}</p>
                  {gift.attempts.find((attempt) => attempt.returnable) && (
                    <GiftAction
                      id={gift.attempts.find((attempt) => attempt.returnable)!.id}
                      token={token}
                      type="return"
                    />
                  )}
                </div>
              ))}
          {result.data.length === 0 && (
            <p className="p-12 text-center text-sm text-[var(--studio-muted)]">
              ギフト履歴はありません
            </p>
          )}
        </div>
        {result.meta.last_page > 1 && (
          <div className="flex items-center justify-end gap-2 border-t border-[var(--studio-border)] p-4">
            <Button asChild variant="outline" size="sm">
              <Link href={`/studio/gifts?tab=${tab}&page=${Math.max(1, page - 1)}`}>前へ</Link>
            </Button>
            <span className="text-sm">
              {page} / {result.meta.last_page}
            </span>
            <Button asChild variant="outline" size="sm">
              <Link
                href={`/studio/gifts?tab=${tab}&page=${Math.min(result.meta.last_page, page + 1)}`}
              >
                次へ
              </Link>
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}
