"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Check, Copy, ExternalLink, Gift, Loader2, RefreshCw, RotateCcw } from "lucide-react";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  amazonGiftCardUrl,
  formatYen,
  giftEmailAddress,
  giftAttemptFailureReason,
  giftStyleClass,
  isGiftAttemptCompleted,
  isGiftAttemptReturnable,
} from "@/lib/gifts";
import { cn } from "@/lib/utils";
import { getSentGifts, GiftApiError, returnGift } from "@/requests/gifts";
import type { GiftAttempt, SentGiftPage, SentGiftSession } from "@/types/gift";

const EMPTY_PAGE: SentGiftPage = { data: [], currentPage: 1, lastPage: 1, total: 0 };

function formatDate(value?: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("ja-JP");
}

function statusLabel(status: SentGiftSession["status"]): string {
  if (status === "completed") return "送信完了";
  if (status === "expired") return "期限切れ";
  return "送信待ち";
}

function failureLabel(reason: GiftAttempt["failure_reason"]): string {
  if (reason === "amount_mismatch") return "金額が一致しません";
  if (reason === "session_expired") return "有効期限を過ぎています";
  if (reason === "session_already_completed") return "すでに別のギフトで完了しています";
  return "送信失敗";
}

export function GiftHistory({ token }: { token: string }) {
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<SentGiftPage>(EMPTY_PAGE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [returningId, setReturningId] = useState<number | string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setResult(await getSentGifts(page, token));
    } catch (caught) {
      if (caught instanceof GiftApiError && caught.status === 401) {
        setError("ログインの有効期限が切れました。もう一度ログインしてください。");
      } else {
        setError(caught instanceof Error ? caught.message : "ギフト履歴を取得できませんでした。");
      }
    } finally {
      setLoading(false);
    }
  }, [page, token]);

  useEffect(() => {
    load();
  }, [load]);

  async function openReturnedGift(giftId: number | string) {
    const popup = window.open("about:blank", "_blank");
    if (popup) popup.opener = null;
    setReturningId(giftId);
    setError("");
    try {
      const response = await returnGift(giftId, token);
      const url = response.claim_url ?? response.claimUrl;
      if (!url) throw new Error("返却先URLを取得できませんでした。");
      if (popup) popup.location.replace(url);
      else window.location.assign(url);
      await load();
    } catch (caught) {
      popup?.close();
      setError(caught instanceof Error ? caught.message : "ギフトを返却できませんでした。");
    } finally {
      setReturningId(null);
    }
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Gift className="h-6 w-6" aria-hidden="true" />
            <h1 className="text-2xl font-bold">ギフト履歴</h1>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={load} disabled={loading}>
            <RefreshCw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} />
            更新
          </Button>
          <Button asChild variant="outline">
            <a href="/studio/gifts">
              受け取ったギフトを見る
              <ExternalLink className="ml-2 h-4 w-4" aria-hidden="true" />
            </a>
          </Button>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="mb-5 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          <p>{error}</p>
          {error.includes("ログイン") && (
            <Button
              className="mt-3"
              size="sm"
              onClick={() => signIn("tokuly", { callbackUrl: "/gifts" })}
            >
              再ログイン
            </Button>
          )}
        </div>
      )}

      {loading && result.data.length === 0 ? (
        <div className="flex min-h-48 items-center justify-center rounded-lg border bg-white">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          読み込み中
        </div>
      ) : result.data.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-white px-4 py-16 text-center">
          <Gift className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <p className="font-medium">送信したギフトはまだありません</p>
          <p className="mt-1 text-sm text-muted-foreground">
            ライブチャットのギフトボタンから送信できます。
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {result.data.map((session) => {
            const channel = session.recipient_channel ?? session.channel;
            const stream = session.live_stream ?? session.stream;
            const attempts = session.gifts ?? session.attempts ?? session.received_attempts ?? [];
            return (
              <article
                key={session.id}
                className={cn(
                  "overflow-hidden rounded-lg border-l-4 bg-white shadow-sm",
                  giftStyleClass(session.display_style)
                )}
              >
                <div className="grid gap-4 p-4 sm:grid-cols-[1fr_auto]">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="truncate font-semibold">
                        {channel?.name ?? "送信先チャンネル"}
                      </h2>
                      <span className="rounded-full bg-white/70 px-2 py-0.5 text-xs font-medium">
                        {statusLabel(session.status)}
                      </span>
                    </div>
                    {stream?.title && <p className="mt-1 truncate text-sm">配信: {stream.title}</p>}
                    {session.comment && (
                      <p className="mt-2 break-words text-sm">{session.comment}</p>
                    )}
                    <dl className="mt-3 grid gap-x-6 gap-y-1 text-xs sm:grid-cols-2">
                      <div>
                        <dt className="inline text-muted-foreground">作成: </dt>
                        <dd className="inline">{formatDate(session.created_at)}</dd>
                      </div>
                      <div>
                        <dt className="inline text-muted-foreground">期限: </dt>
                        <dd className="inline">{formatDate(session.expires_at)}</dd>
                      </div>
                      {session.completed_at && (
                        <div>
                          <dt className="inline text-muted-foreground">完了: </dt>
                          <dd className="inline">{formatDate(session.completed_at)}</dd>
                        </div>
                      )}
                    </dl>
                  </div>
                  <strong className="whitespace-nowrap text-xl">
                    {formatYen(session.expected_amount)}
                  </strong>
                </div>

                {session.status === "pending" && session.gift_id && (
                  <PendingGiftActions session={session} />
                )}

                {attempts.length > 0 && (
                  <div className="space-y-2 border-t border-black/10 bg-white/60 p-4">
                    <h3 className="text-sm font-semibold">受信状況</h3>
                    {attempts.map((attempt) => (
                      <GiftAttemptRow
                        key={attempt.id}
                        attempt={attempt}
                        returning={returningId === attempt.id}
                        onReturn={() => openReturnedGift(attempt.id)}
                      />
                    ))}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {result.lastPage > 1 && (
        <nav
          aria-label="ギフト履歴のページ"
          className="mt-6 flex items-center justify-center gap-3"
        >
          <Button
            variant="outline"
            disabled={loading || page <= 1}
            onClick={() => setPage((value) => value - 1)}
          >
            前へ
          </Button>
          <span className="text-sm">
            {result.currentPage} / {result.lastPage}
          </span>
          <Button
            variant="outline"
            disabled={loading || page >= result.lastPage}
            onClick={() => setPage((value) => value + 1)}
          >
            次へ
          </Button>
        </nav>
      )}
    </main>
  );
}

function PendingGiftActions({ session }: { session: SentGiftSession }) {
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const email = giftEmailAddress(session.gift_id!);

  async function copyEmail() {
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      setCopyFailed(false);
    } catch {
      setCopied(false);
      setCopyFailed(true);
    }
  }

  return (
    <div className="space-y-3 border-t border-black/10 bg-white/70 p-4">
      <div>
        <h3 className="text-sm font-semibold">Amazonギフトカードを送信</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Eメールタイプで、表示された金額と宛先を正確に指定してください。
        </p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          aria-label="ギフト送信先メールアドレス"
          value={email}
          readOnly
          onFocus={(event) => event.currentTarget.select()}
          className="bg-white"
        />
        <Button type="button" variant="outline" onClick={copyEmail} className="shrink-0">
          {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
          {copied ? "コピー済み" : "宛先をコピー"}
        </Button>
        <Button asChild className="shrink-0">
          <a
            href={amazonGiftCardUrl(session.expected_amount)}
            target="_blank"
            rel="noopener noreferrer"
          >
            Amazonを開く <ExternalLink className="ml-2 h-4 w-4" />
          </a>
        </Button>
      </div>
      {copyFailed && (
        <p role="alert" className="text-xs text-destructive">
          コピーできませんでした。宛先を選択してコピーしてください。
        </p>
      )}
    </div>
  );
}

function GiftAttemptRow({
  attempt,
  returning,
  onReturn,
}: {
  attempt: GiftAttempt;
  returning: boolean;
  onReturn: () => void;
}) {
  const completed = isGiftAttemptCompleted(attempt);
  const returnable = isGiftAttemptReturnable(attempt);

  return (
    <div className="flex flex-col gap-3 rounded-md border bg-white p-3 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <p className={cn("text-sm font-medium", completed ? "text-green-700" : "text-red-700")}>
          {completed ? "送信完了" : failureLabel(giftAttemptFailureReason(attempt))}
        </p>
        <p className="text-xs text-muted-foreground">
          受信額 {formatYen(attempt.amount)} ・{" "}
          {formatDate(attempt.received_at ?? attempt.created_at)}
        </p>
      </div>
      {returnable && (
        <Button size="sm" variant="outline" disabled={returning} onClick={onReturn}>
          {returning ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RotateCcw className="mr-2 h-4 w-4" />
          )}
          {attempt.accessed_at ? "再度開く" : "ギフトを返却"}
        </Button>
      )}
    </div>
  );
}
