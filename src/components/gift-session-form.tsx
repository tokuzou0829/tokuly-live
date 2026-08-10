"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Check, Copy, ExternalLink, Gift, Info, Loader2, Minus, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { amazonGiftCardUrl, formatYen, getGiftTier } from "@/lib/gifts";
import { cn } from "@/lib/utils";
import { createGiftSession, GiftApiError } from "@/requests/gifts";
import type { CreatedGiftSession } from "@/types/gift";
import { ChatItemView } from "@/components/chat-item";

const MIN_GIFT_AMOUNT = 150;
const MAX_GIFT_AMOUNT = 200_000;
const SLIDER_MAX = 1_000;
const AMOUNT_PRESETS = [150, 500, 1_000, 5_000, 10_000] as const;

export function giftAmountToSliderPosition(amount: number) {
  const clamped = Math.min(MAX_GIFT_AMOUNT, Math.max(MIN_GIFT_AMOUNT, amount));
  return Math.round(
    (Math.log(clamped / MIN_GIFT_AMOUNT) / Math.log(MAX_GIFT_AMOUNT / MIN_GIFT_AMOUNT)) * SLIDER_MAX
  );
}

export function sliderPositionToGiftAmount(position: number) {
  if (position <= 0) return MIN_GIFT_AMOUNT;
  if (position >= SLIDER_MAX) return MAX_GIFT_AMOUNT;
  const raw = MIN_GIFT_AMOUNT * Math.pow(MAX_GIFT_AMOUNT / MIN_GIFT_AMOUNT, position / SLIDER_MAX);
  const rounding = raw < 1_000 ? 10 : raw < 10_000 ? 100 : 1_000;
  return Math.min(
    MAX_GIFT_AMOUNT,
    Math.max(MIN_GIFT_AMOUNT, Math.round(raw / rounding) * rounding)
  );
}

type Props = {
  channelId: number;
  liveStreamId: number;
  token: string;
  senderChannelId?: number;
  senderName?: string | null;
  senderImage?: string | null;
  compact?: boolean;
};

function GiftInformationOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;

  return (
    <div className="gift-information-overlay" onClick={onClose}>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="gift-information-title"
        className="gift-information-panel"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="gift-information-title" className="text-base font-semibold text-[#0f0f0f]">
              ギフトメッセージについて
            </h2>
            <p className="mt-1 text-xs leading-5 text-[#606060]">
              Tokulyに手数料を支払うことなく配信者を応援しながら、チャットで目立つメッセージを届けられます。
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="gift-information-close"
            aria-label="説明を閉じる"
            onClick={onClose}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
        <ul className="mt-4 grid gap-3 text-sm leading-6 text-[#0f0f0f]">
          <li>金額に応じた色のカードとしてチャットに表示されます。</li>
          <li>入力できるメッセージの文字数は金額によって異なります。</li>
          <li>準備後、表示された宛先へAmazonギフトカードを送ると完了します。</li>
          <li>配信終了または有効期限までに送信を完了してください。</li>
        </ul>
        <aside className="gift-information-notes" aria-labelledby="gift-information-notes-title">
          <h3 id="gift-information-notes-title" className="text-sm font-semibold text-[#0f0f0f]">
            注意事項
          </h3>
          <ul className="mt-2 grid gap-2 text-xs leading-5 text-[#0f0f0f]">
            <li>ギフトメッセージ送信時の送り主の名前は、配信者に表示されます。</li>
            <li>
              間違った金額や無効なセッションに送信したギフトは、ギフト履歴画面から返還されます。
            </li>
            <li>
              存在しないセッションに送信したギフトの返還についてはサポートにお問い合わせください。
            </li>
            <li>Tokulyはギフト機能において発生した全ての問題について責任を負いません。</li>
          </ul>
        </aside>
        <Button
          type="button"
          className="mt-5 h-10 w-full rounded-full bg-[#0f0f0f] hover:bg-[#272727]"
          onClick={onClose}
        >
          閉じる
        </Button>
      </section>
    </div>
  );
}

export function GiftSessionForm({
  channelId,
  liveStreamId,
  token,
  senderChannelId,
  senderName,
  senderImage,
  compact = false,
}: Props) {
  const [amountText, setAmountText] = useState("1000");
  const [comment, setComment] = useState("");
  const [created, setCreated] = useState<CreatedGiftSession | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [informationOpen, setInformationOpen] = useState(false);
  const amount = Number(amountText);
  const tier = useMemo(() => getGiftTier(amount), [amount]);
  const sliderPosition = giftAmountToSliderPosition(Number.isFinite(amount) ? amount : 1_000);

  useEffect(() => {
    if (!informationOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setInformationOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [informationOpen]);

  function setAmount(nextAmount: number) {
    const clamped = Math.min(MAX_GIFT_AMOUNT, Math.max(MIN_GIFT_AMOUNT, Math.round(nextAmount)));
    setAmountText(String(clamped));
    setError("");
  }

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
          ...(senderChannelId === undefined ? {} : { sender_channel_id: senderChannelId }),
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
            "gift-form relative w-full overflow-hidden bg-white",
            compact ? "" : "rounded-2xl border border-[#e5e5e5] shadow-sm"
          )}
        >
          <header className="gift-form-header flex items-center gap-3 border-b border-[#e5e5e5] px-5 py-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f2f2f2] text-[#0f0f0f]">
              <Gift className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-base font-semibold text-[#0f0f0f]">送信の準備ができました</h1>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="gift-information-button"
              aria-label="ギフトメッセージについて"
              onClick={() => setInformationOpen(true)}
            >
              <Info className="h-5 w-5" aria-hidden="true" />
            </Button>
          </header>
          <div className="grid gap-4 p-5">
            <div className="gift-form-preview-card" aria-label="ギフト表示プレビュー">
              <ChatItemView
                item={{
                  type: "gift",
                  id: "created-gift-preview",
                  image: senderImage,
                  name: senderName?.trim() || "あなた",
                  text: created.comment ?? "",
                  amount: created.expected_amount,
                  provider: "amazon",
                  display_style: created.display_style,
                  completed_at: "",
                }}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="gift-email" className="text-sm font-semibold text-[#0f0f0f]">
                送信先メールアドレス
              </Label>
              <div className="flex gap-2">
                <Input
                  id="gift-email"
                  value={created.gift_email}
                  readOnly
                  className="rounded-full border-[#e5e5e5] bg-[#f2f2f2]"
                  onFocus={(event) => event.currentTarget.select()}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="shrink-0 !rounded-full border-[#e5e5e5]"
                  onClick={copyAddress}
                  aria-label="送信先をコピー"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              {copied && <p className="text-xs text-green-700">コピーしました</p>}
            </div>
            <div className="rounded-xl bg-[#f2f2f2] p-3 text-sm leading-6 text-[#0f0f0f]">
              {created.valid_while_stream_online
                ? "この宛先はライブ配信中のみ有効です。配信終了前に送信してください。"
                : created.expires_at
                  ? `有効期限: ${new Date(created.expires_at).toLocaleString("ja-JP")}`
                  : "表示された宛先が有効な間に送信してください。"}
            </div>
            <ol className="list-decimal space-y-1 pl-5 text-sm leading-6 text-[#606060]">
              <li>AmazonギフトカードのEメールタイプを開く</li>
              <li>金額と送信先メールアドレスを正確に入力する</li>
              <li>Amazonで注文を完了する</li>
            </ol>
            <p className="text-xs leading-5 text-[#606060]">
              この表示を閉じても、送信状況は「ギフト履歴」から確認できます。
            </p>
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <Button asChild className="h-11 w-full rounded-full bg-[#0f0f0f] hover:bg-[#272727]">
              <a
                href={amazonGiftCardUrl(created.expected_amount)}
                target="_blank"
                rel="noopener noreferrer"
              >
                Amazonを開く <ExternalLink className="ml-2 h-4 w-4" />
              </a>
            </Button>
          </div>
          <GiftInformationOverlay
            open={informationOpen}
            onClose={() => setInformationOpen(false)}
          />
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
          "gift-form relative w-full overflow-hidden bg-white",
          compact ? "" : "rounded-2xl border border-[#e5e5e5] shadow-sm"
        )}
      >
        <header className="gift-form-header flex items-center gap-3 border-b border-[#e5e5e5] px-5 py-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f2f2f2] text-[#0f0f0f]">
            <Gift className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-base font-semibold text-[#0f0f0f]">ギフト付きメッセージ</h1>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="gift-information-button"
            aria-label="ギフトメッセージについて"
            onClick={() => setInformationOpen(true)}
          >
            <Info className="h-5 w-5" aria-hidden="true" />
          </Button>
        </header>
        <div className={cn("grid gap-5", compact ? "p-4" : "p-5")}>
          <div className="gift-form-preview-card" aria-label="ギフト表示プレビュー">
            {tier ? (
              <ChatItemView
                item={{
                  type: "gift",
                  id: "gift-preview",
                  image: senderImage,
                  name: senderName?.trim() || "あなた",
                  text: "",
                  amount,
                  provider: "amazon",
                  display_style: tier.displayStyle,
                  completed_at: "",
                }}
                messageEditor={
                  tier.maxCommentLength === 0 ? undefined : (
                    <div className="gift-preview-message-editor">
                      <div className="mb-1 flex justify-end text-[11px] opacity-70">
                        {comment.length}/{tier.maxCommentLength}
                      </div>
                      <Textarea
                        id="gift-comment"
                        aria-label="メッセージ"
                        value={comment}
                        maxLength={tier.maxCommentLength}
                        onChange={(event) => setComment(event.target.value)}
                        className="gift-preview-message-input"
                        placeholder="応援しています"
                      />
                    </div>
                  )
                }
              />
            ) : (
              <p className="rounded-xl border border-[#e5e5e5] px-4 py-6 text-center text-sm text-[#606060]">
                有効な金額を入力するとプレビューが表示されます
              </p>
            )}
          </div>

          <fieldset className="grid gap-3">
            <legend className="mb-2 text-sm font-semibold text-[#0f0f0f]">金額</legend>
            <div className="gift-amount-editor">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="gift-amount-step"
                aria-label="金額を100円減らす"
                onClick={() => setAmount((tier ? amount : 1_000) - 100)}
              >
                <Minus className="h-4 w-4" aria-hidden="true" />
              </Button>
              <div className="relative min-w-0 flex-1">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-[#606060]">
                  ¥
                </span>
                <Input
                  id="gift-amount"
                  type="number"
                  inputMode="numeric"
                  min={MIN_GIFT_AMOUNT}
                  max={MAX_GIFT_AMOUNT}
                  step={1}
                  value={amountText}
                  onChange={(event) => {
                    setAmountText(event.target.value);
                    setError("");
                  }}
                  className="gift-amount-input pl-7 text-center text-base font-semibold"
                  aria-label="ギフト金額"
                  aria-describedby="gift-amount-help"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="gift-amount-step"
                aria-label="金額を100円増やす"
                onClick={() => setAmount((tier ? amount : 1_000) + 100)}
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
            <div className="px-1 py-1">
              <input
                type="range"
                className="gift-amount-slider"
                min={0}
                max={SLIDER_MAX}
                step={1}
                value={sliderPosition}
                style={
                  {
                    "--gift-slider-progress": `${(sliderPosition / SLIDER_MAX) * 100}%`,
                  } as React.CSSProperties
                }
                onChange={(event) =>
                  setAmount(sliderPositionToGiftAmount(Number(event.target.value)))
                }
                aria-label="ギフト金額を大きく調整"
              />
            </div>
            <div className="gift-amount-presets" aria-label="金額プリセット">
              {AMOUNT_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  aria-pressed={amount === preset}
                  onClick={() => setAmount(preset)}
                  className="gift-amount-preset"
                >
                  {formatYen(preset)}
                </button>
              ))}
            </div>
            <span id="gift-amount-help" className="sr-only">
              150円から200,000円まで指定できます
            </span>
          </fieldset>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <Button
            type="submit"
            className="h-11 w-full rounded-full bg-[#0f0f0f] hover:bg-[#272727]"
            disabled={submitting || !tier}
          >
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            ギフトを準備する
          </Button>
        </div>
        <GiftInformationOverlay open={informationOpen} onClose={() => setInformationOpen(false)} />
      </form>
    </div>
  );
}
