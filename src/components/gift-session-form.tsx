"use client";

import { useMemo, useState } from "react";
import { Check, Copy, ExternalLink, Gift, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { amazonGiftCardUrl, formatYen, getGiftTier, giftStyleClass } from "@/lib/gifts";
import { cn } from "@/lib/utils";
import { createGiftSession, GiftApiError } from "@/requests/gifts";
import type { CreatedGiftSession } from "@/types/gift";

type Props = {
  channelId: number;
  liveStreamId: number;
  token: string;
  compact?: boolean;
};

export function GiftSessionForm({ channelId, liveStreamId, token, compact = false }: Props) {
  const [amountText, setAmountText] = useState("1000");
  const [comment, setComment] = useState("");
  const [created, setCreated] = useState<CreatedGiftSession | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const amount = Number(amountText);
  const tier = useMemo(() => getGiftTier(amount), [amount]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!tier) {
      setError("金額は150円から200,000円までの整数で入力してください。");
      return;
    }
    if (comment.length > tier.maxCommentLength) {
      setError(`コメントは${tier.maxCommentLength}文字以内で入力してください。`);
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const result = await createGiftSession(
        {
          channel_id: channelId,
          live_stream_id: liveStreamId,
          amount,
          comment: tier.maxCommentLength === 0 ? "" : comment,
        },
        token
      );
      setCreated(result);
    } catch (caught) {
      const apiError = caught instanceof GiftApiError ? caught : null;
      const fieldMessage = apiError ? Object.values(apiError.fields).flat()[0] : null;
      setError(fieldMessage ?? apiError?.message ?? "ギフトセッションを作成できませんでした。");
    } finally {
      setSubmitting(false);
    }
  }

  async function copyAddress() {
    if (!created) return;
    try {
      await navigator.clipboard.writeText(created.gift_email);
      setCopied(true);
      setError("");
    } catch {
      setCopied(false);
      setError("コピーできませんでした。宛先を選択してコピーしてください。");
    }
  }

  if (created) {
    return (
      <div
        className={
          compact ? "w-full" : "mx-auto flex min-h-screen w-full max-w-xl items-center px-4 py-8"
        }
      >
        <section
          className={cn(
            "w-full bg-white",
            compact ? "p-4" : "rounded-xl border p-5 shadow-sm sm:p-7"
          )}
        >
          <header>
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Gift className="h-5 w-5" aria-hidden="true" />
            </div>
            <h1 className="text-xl font-bold">Amazonギフトカードを送信してください</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              AmazonのEメールタイプで、下記の金額と宛先を正確に指定してください。
            </p>
          </header>
          <div className="grid gap-4 py-5">
            <div className={cn("rounded-lg border-l-4 p-4", giftStyleClass(created.display_style))}>
              <p className="text-sm font-medium">指定金額</p>
              <p className="text-2xl font-bold">{formatYen(created.expected_amount)}</p>
              {created.comment && <p className="mt-2 text-sm">{created.comment}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="gift-email">送信先メールアドレス</Label>
              <div className="flex gap-2">
                <Input
                  id="gift-email"
                  value={created.gift_email}
                  readOnly
                  onFocus={(event) => event.currentTarget.select()}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={copyAddress}
                  aria-label="送信先をコピー"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              {copied && <p className="text-xs text-green-700">コピーしました</p>}
            </div>
            <div className="rounded-md bg-muted p-3 text-sm">
              {created.valid_while_stream_online
                ? "この宛先はライブ配信中のみ有効です。配信終了前に送信してください。"
                : created.expires_at
                  ? `有効期限: ${new Date(created.expires_at).toLocaleString("ja-JP")}`
                  : "表示された宛先が有効な間に送信してください。"}
            </div>
            <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
              <li>AmazonギフトカードのEメールタイプを開く</li>
              <li>金額と送信先メールアドレスを正確に入力する</li>
              <li>Amazonで注文を完了する</li>
            </ol>
            <p className="text-xs text-muted-foreground">
              この表示を閉じても、送信状況は「ギフト履歴」から確認できます。
            </p>
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
          </div>
          <Button asChild className="w-full">
            <a
              href={amazonGiftCardUrl(created.expected_amount)}
              target="_blank"
              rel="noopener noreferrer"
            >
              Amazonを開く <ExternalLink className="ml-2 h-4 w-4" />
            </a>
          </Button>
        </section>
      </div>
    );
  }

  return (
    <div
      className={
        compact ? "w-full" : "mx-auto flex min-h-screen w-full max-w-xl items-center px-4 py-8"
      }
    >
      <form
        onSubmit={handleSubmit}
        className={cn(
          "w-full bg-white",
          compact ? "p-4" : "rounded-xl border p-5 shadow-sm sm:p-7"
        )}
      >
        <header>
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Gift className="h-5 w-5" aria-hidden="true" />
          </div>
          <h1 className="text-xl font-bold">ギフト付きメッセージ</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            金額とメッセージを決めた後、発行された宛先へAmazonギフトカードを送信します。
          </p>
        </header>
        <div className="grid gap-5 py-5">
          <div className="grid gap-2">
            <Label htmlFor="gift-amount">金額（円）</Label>
            <Input
              id="gift-amount"
              type="number"
              inputMode="numeric"
              min={150}
              max={200000}
              step={1}
              value={amountText}
              onChange={(event) => setAmountText(event.target.value)}
              aria-describedby="gift-amount-help"
            />
            <p id="gift-amount-help" className="text-xs text-muted-foreground">
              150円〜200,000円の整数で指定してください。
            </p>
          </div>
          <div className="grid gap-2">
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="gift-comment">メッセージ</Label>
              <span className="text-xs text-muted-foreground">
                {comment.length}/{tier?.maxCommentLength ?? 0}
              </span>
            </div>
            <Textarea
              id="gift-comment"
              value={comment}
              disabled={!tier || tier.maxCommentLength === 0}
              maxLength={tier?.maxCommentLength ?? 0}
              onChange={(event) => setComment(event.target.value)}
              placeholder={
                tier?.maxCommentLength === 0
                  ? "この金額帯ではメッセージを付けられません"
                  : "応援しています"
              }
            />
          </div>
          {tier && (
            <div
              className={cn(
                "rounded-md border-l-4 px-3 py-2 text-sm",
                giftStyleClass(tier.displayStyle)
              )}
            >
              {formatYen(amount)}のギフトとして表示されます
            </div>
          )}
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
        </div>
        <Button type="submit" className="w-full" disabled={submitting || !tier}>
          {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          ギフトを準備する
        </Button>
      </form>
    </div>
  );
}
