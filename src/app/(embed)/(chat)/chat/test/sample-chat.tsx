"use client";

import React, { useEffect, useState } from "react";
import { Gift, Send } from "lucide-react";
import { ChatComposerAvatar } from "@/components/chat-composer-avatar";
import { ChatItemView } from "@/components/chat-item";
import type { ChatItem, GiftDisplayStyle } from "@/types/gift";

const WIDE_AVATAR =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='60' viewBox='0 0 120 60'%3E%3Crect width='120' height='60' fill='%23065fd4'/%3E%3Ccircle cx='60' cy='30' r='24' fill='%23ffffff'/%3E%3Ctext x='60' y='37' text-anchor='middle' font-size='22' font-family='Arial' fill='%23065fd4'%3ET%3C/text%3E%3C/svg%3E";

const giftSamples: Array<{
  style: GiftDisplayStyle;
  amount: number;
  text: string;
}> = [
  { style: "blue", amount: 150, text: "" },
  { style: "cyan", amount: 200, text: "ナイス配信！" },
  { style: "light-green", amount: 500, text: "いつも楽しく見ています。" },
  { style: "yellow", amount: 1_000, text: "これからも応援しています！" },
  { style: "orange", amount: 2_000, text: "素敵な時間をありがとう 🎉" },
  { style: "magenta", amount: 5_000, text: "最高の配信です！次回も楽しみにしています。" },
  { style: "red", amount: 10_000, text: "記念配信おめでとうございます！" },
  { style: "black", amount: 50_000, text: "これからの活動もずっと応援しています。" },
  { style: "rainbow", amount: 200_000, text: "スペシャルギフト！本当におめでとう！🌈" },
];

const normalSamples: ChatItem[] = [
  { type: "chat", id: "normal-short", name: "Alice", text: "こんにちは！" },
  {
    type: "chat",
    id: "normal-avatar",
    image: WIDE_AVATAR,
    name: "横長アバター",
    text: "正方形ではない画像も丸く中央トリミングされます。",
  },
  {
    type: "chat",
    id: "normal-long",
    name: "長文ユーザー",
    text: "これは長いチャットメッセージの表示確認です。文章が自然に折り返されてレイアウトからはみ出さないことを確認できます。日本語の句読点や英数字ABC123も含まれています。",
  },
  {
    type: "chat",
    id: "normal-long-name",
    name: "とてもとても長いチャンネル名を使用しているサンプルユーザー",
    text: "長い名前の表示テストです。",
  },
  {
    type: "chat",
    id: "normal-emoji",
    name: "Emoji Fan 🚀",
    text: "👏 🎉 ❤️ 😂 🔥 ✨ 🌈 絵文字の表示テスト",
  },
  {
    type: "chat",
    id: "normal-multiline",
    name: "改行テスト",
    text: "1行目のメッセージ\n2行目のメッセージ\n3行目のメッセージ",
  },
  {
    type: "chat",
    id: "normal-unbroken",
    name: "URLテスト",
    text: "https://live.tokuly.com/very-long-path-without-spaces-for-wrapping-check",
  },
  {
    type: "chat",
    id: "normal-safe-text",
    name: "特殊文字テスト",
    text: '<script>alert("text")</script> & <strong>HTMLは文字として表示</strong>',
  },
];

export const CHAT_TEST_ITEMS: ChatItem[] = normalSamples
  .flatMap((message, index) => {
    const gift = giftSamples[index];
    if (!gift) return [message];
    return [
      message,
      {
        type: "gift" as const,
        id: `gift-${gift.style}`,
        image: index % 2 === 0 ? WIDE_AVATAR : null,
        name: `${gift.style} ギフト`,
        text: gift.text,
        amount: gift.amount,
        provider: "sample",
        display_style: gift.style,
        completed_at: "2026-08-07T00:00:00Z",
      },
    ];
  })
  .concat({
    type: "gift",
    id: "gift-rainbow",
    image: WIDE_AVATAR,
    name: "rainbow ギフト",
    text: giftSamples[8].text,
    amount: giftSamples[8].amount,
    provider: "sample",
    display_style: giftSamples[8].style,
    completed_at: "2026-08-07T00:00:00Z",
  });

type ChatCssMessage = {
  type: "tokuly:chat-css:update";
  version: 1;
  css: string;
};

function isChatCssMessage(value: unknown): value is ChatCssMessage {
  if (!value || typeof value !== "object") return false;
  const message = value as Partial<ChatCssMessage>;
  return (
    message.type === "tokuly:chat-css:update" &&
    message.version === 1 &&
    typeof message.css === "string" &&
    message.css.length <= 50_000
  );
}

export default function SampleChat() {
  const [messages, setMessages] = useState<ChatItem[]>([]);
  const [draft, setDraft] = useState("");
  const hasMessage = draft.trim().length > 0;

  useEffect(() => {
    let sampleIndex = 0;
    let timer: ReturnType<typeof setTimeout>;

    function showNextMessage() {
      if (sampleIndex >= CHAT_TEST_ITEMS.length) {
        timer = setTimeout(() => {
          setMessages([]);
          sampleIndex = 0;
          timer = setTimeout(showNextMessage, 600);
        }, 4_000);
        return;
      }

      const nextMessage = CHAT_TEST_ITEMS[sampleIndex];
      setMessages((previous) => [nextMessage, ...previous]);
      sampleIndex += 1;
      timer = setTimeout(showNextMessage, 900);
    }

    timer = setTimeout(showNextMessage, 300);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    function applyPreviewCss(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      if (event.source !== window.parent) return;
      if (!isChatCssMessage(event.data)) return;

      let style = document.querySelector<HTMLStyleElement>("#tokuly-chat-preview-style");
      if (!style) {
        style = document.createElement("style");
        style.id = "tokuly-chat-preview-style";
        document.head.appendChild(style);
      }
      style.textContent = event.data.css;
    }

    window.addEventListener("message", applyPreviewCss);
    if (window.parent !== window) {
      window.parent.postMessage(
        { type: "tokuly:chat-css:ready", version: 1 },
        window.location.origin
      );
    }

    return () => {
      window.removeEventListener("message", applyPreviewCss);
      document.querySelector("#tokuly-chat-preview-style")?.remove();
    };
  }, []);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;

    setMessages((previous) => [
      {
        type: "chat",
        id: `manual-${Date.now()}`,
        image: WIDE_AVATAR,
        name: "プレビューユーザー",
        text,
      },
      ...previous,
    ]);
    setDraft("");
  }

  return (
    <section className="chat-body h-full w-full" data-testid="chat-test-preview">
      <div className="chat-label">
        <p>チャット（CSSテスト）</p>
      </div>
      <div className="chat-message-box">
        {messages.map((message) => (
          <ChatItemView key={`${message.type}-${message.id}`} item={message} compact />
        ))}
        <p className="chat-status" role="status">
          サンプルメッセージを再生中
        </p>
      </div>
      <form onSubmit={handleSubmit} className="chat-input">
        <div className="chat-input-row">
          <ChatComposerAvatar image={WIDE_AVATAR} name="プレビューユーザー" />
          <input
            type="text"
            aria-label="チャットメッセージ"
            autoComplete="off"
            placeholder="チャット"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            className="chat-input-field"
          />
          {hasMessage ? (
            <button type="submit" aria-label="チャットを送信" className="chat-send-button">
              <Send aria-hidden="true" size={20} />
            </button>
          ) : (
            <button
              type="button"
              aria-label="ギフト付きメッセージの表示サンプル"
              className="chat-gift-button !rounded-full"
            >
              <Gift aria-hidden="true" className="h-5 w-5" />
            </button>
          )}
        </div>
      </form>
    </section>
  );
}
