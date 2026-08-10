export const CHAT_CSS_MAX_LENGTH = 50_000;

export type ChatCssPresetId = "bubble" | "simple" | "custom";

export const CHAT_CSS_PRESETS: Record<ChatCssPresetId, { label: string; css: string }> = {
  bubble: {
    label: "吹き出し",
    css: `/* ========================================
   Tokuly Live - OBSチャットオーバーレイ
   ======================================== */

html,
body {
  width: 100%;
  height: 100%;
  margin: 0;
  overflow: hidden;
  background: transparent !important;
}

.chat-body {
  --chat-background: transparent;
  --chat-surface: transparent;
  --chat-text: #111111;
  --chat-muted-text: #555555;
  --chat-border: transparent;
  --chat-hover: transparent;
  --chat-avatar-size: 32px;
  --chat-message-gap: 8px;
  --chat-message-padding: 4px 12px;

  border: 0;
  border-radius: 0;
  background: transparent;
}

.chat-label,
.chat-input,
.chat-status,
.chat-login-message {
  display: none !important;
}

.chat-message-box {
  height: 100%;
  padding: 12px 0;
  overflow-y: hidden;
  background: transparent;
  scrollbar-width: none;
}

.chat-message-box::-webkit-scrollbar {
  display: none;
}

.chat-message:not(.chat-gift-message) {
  display: flex;
  width: fit-content;
  max-width: calc(100% - 16px);
  margin: 2px 0;
  padding: 4px 12px;
  background: transparent;
}

.chat-avatar {
  flex: 0 0 var(--chat-avatar-size);
  width: var(--chat-avatar-size) !important;
  height: var(--chat-avatar-size) !important;
  min-width: var(--chat-avatar-size);
  min-height: var(--chat-avatar-size);
  max-width: var(--chat-avatar-size);
  max-height: var(--chat-avatar-size);
  aspect-ratio: 1 / 1;
  object-fit: cover;
  object-position: center;
  border: 2px solid rgba(255, 255, 255, 0.95);
  border-radius: 50%;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.28);
}

.chat-message:not(.chat-gift-message) .chat-message-content {
  min-width: 0;
  padding: 7px 11px;
  border-radius: 4px 14px 14px 14px;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.22), 0 1px 2px rgba(0, 0, 0, 0.12);
  backdrop-filter: blur(6px);
}

.chat-message:not(.chat-gift-message) .chat-message-name {
  display: block;
  margin: 0 0 2px;
  color: #555555;
  font-size: 12px;
  font-weight: 700;
  line-height: 16px;
}

.chat-message:not(.chat-gift-message) .chat-message-text {
  color: #111111;
  font-size: 16px;
  font-weight: 600;
  line-height: 1.45;
  overflow-wrap: anywhere;
  text-shadow: none;
}

.chat-gift-message {
  width: auto;
  max-width: calc(100% - 24px);
  margin: 6px 12px;
  padding: 10px 12px;
  border-radius: 12px;
  box-shadow: 0 3px 12px rgba(0, 0, 0, 0.3);
}

.chat-gift-message .chat-avatar {
  flex-basis: 28px;
  width: 28px !important;
  height: 28px !important;
  min-width: 28px;
  min-height: 28px;
  max-width: 28px;
  max-height: 28px;
  box-shadow: none;
}

.chat-gift-amount {
  font-size: 15px;
  font-weight: 800;
}

.chat-message {
  animation: chat-in 240ms ease-out both;
}

@keyframes chat-in {
  from {
    opacity: 0;
    transform: translateY(8px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}`,
  },
  simple: {
    label: "シンプルホワイト",
    css: `html,
body {
  width: 100%;
  height: 100%;
  margin: 0;
  overflow: hidden;
  background: transparent !important;
}

.chat-body {
  --chat-background: transparent;
  --chat-surface: transparent;
  --chat-border: transparent;
  --chat-hover: transparent;

  border: none !important;
  border-radius: 0;
  background: transparent !important;
}

.chat-input,
.chat-status,
.chat-label {
  display: none !important;
}

.chat-message-box {
  height: 100%;
  padding: 0;
  background: transparent !important;
  scrollbar-width: none;
}

.chat-message-box::-webkit-scrollbar {
  display: none;
}

.chat-message:not(.chat-gift-message) {
  box-sizing: border-box;
  width: calc(100% - 16px);
  margin: 10px 8px 0;
  padding: 10px;
  border-radius: 20px;
  background: #ffffff !important;
  color: #000000 !important;
}

.chat-message:not(.chat-gift-message) .chat-message-name {
  color: #666666 !important;
}

.chat-message:not(.chat-gift-message) .chat-message-text {
  color: #000000 !important;
}

.chat-gift-message {
  width: calc(100% - 16px);
  margin: 10px 8px 0;
}`,
  },
  custom: {
    label: "カスタムCSS",
    css: `/* =========================================================
   Tokuly Live 埋め込みチャット - カスタムCSSテンプレート
   ========================================================= */

html,
body {
  width: 100%;
  height: 100%;
  margin: 0;
  overflow: hidden;
  background: transparent !important;
  font-family: Arial, sans-serif;
}

.chat-body {
  --chat-background: transparent;
  --chat-text: #0f0f0f;
  --chat-muted-text: #606060;
  --chat-border: transparent;
  --chat-hover: transparent;
  --chat-radius: 0;
  --chat-avatar-size: 28px;
  --chat-message-gap: 10px;
  --chat-message-padding: 5px 16px;

  border: none !important;
  border-radius: var(--chat-radius);
  background: transparent !important;
  color: var(--chat-text);
  box-shadow: none;
}

.chat-label,
.chat-input,
.chat-status,
.chat-footer-message,
.chat-login-message,
.chat-archive-message {
  display: none !important;
}

.chat-message-box {
  height: 100%;
  padding: 8px 0;
  overflow-x: hidden;
  background: transparent !important;
  scrollbar-width: none;
}

.chat-message-box::-webkit-scrollbar {
  display: none;
}

.chat-message {
  opacity: 1;
  font-family: inherit;
}

.chat-message:not(.chat-gift-message) {
  display: flex;
  align-items: flex-start;
  gap: var(--chat-message-gap);
  box-sizing: border-box;
  width: calc(100% - 16px);
  max-width: calc(100% - 16px);
  margin: 6px 8px 0;
  padding: var(--chat-message-padding);
  border-radius: 16px;
  background: #ffffff !important;
  color: #000000 !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.18);
}

.chat-avatar {
  display: block !important;
  flex: 0 0 var(--chat-avatar-size);
  width: var(--chat-avatar-size) !important;
  height: var(--chat-avatar-size) !important;
  min-width: var(--chat-avatar-size);
  min-height: var(--chat-avatar-size);
  max-width: var(--chat-avatar-size);
  max-height: var(--chat-avatar-size);
  aspect-ratio: 1 / 1;
  overflow: hidden;
  object-fit: cover;
  object-position: center;
  border: 2px solid rgba(255, 255, 255, 0.95);
  border-radius: 50%;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
}

.chat-avatar img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
  border-radius: 50%;
}

.chat-avatar-fallback {
  background: #e8f0fe !important;
  color: #3c4043 !important;
  font-size: 12px;
  font-weight: 600;
}

.chat-message:not(.chat-gift-message) .chat-message-content {
  min-width: 0;
  padding-top: 3px;
  border-radius: 0;
  background: transparent;
  line-height: 20px;
}

.chat-message:not(.chat-gift-message) .chat-message-name {
  margin-right: 7px;
  overflow-wrap: anywhere;
  color: #666666 !important;
  font-size: 12px;
  font-weight: 500;
}

.chat-message:not(.chat-gift-message) .chat-message-text {
  color: #000000 !important;
  font-size: 14px;
  font-weight: 400;
  line-height: 20px;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  text-shadow: none;
}

.chat-gift-message {
  display: block;
  box-sizing: border-box;
  width: calc(100% - 16px);
  max-width: calc(100% - 16px);
  margin: 8px 8px 0;
  padding: 10px 12px;
  border-radius: 12px;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.22);
}

.chat-gift-header {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.chat-gift-header .chat-message-name {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  color: inherit !important;
  font-size: 13px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chat-gift-amount {
  flex-shrink: 0;
  color: inherit;
  font-size: 14px;
  font-weight: 700;
  white-space: nowrap;
}

.chat-gift-text {
  display: block;
  margin-top: 8px;
  color: inherit !important;
  font-size: 14px;
  font-weight: 400;
  line-height: 20px;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

@media (max-width: 380px) {
  .chat-body {
    --chat-message-padding: 5px 10px;
    --chat-message-gap: 8px;
    --chat-avatar-size: 26px;
  }

  .chat-message:not(.chat-gift-message),
  .chat-gift-message {
    width: calc(100% - 8px);
    max-width: calc(100% - 8px);
    margin-right: 4px;
    margin-left: 4px;
  }
}

/* 任意カスタマイズ例

アバターを非表示:
.chat-avatar { display: none !important; }

投稿者名を非表示:
.chat-message-name { display: none !important; }

ギフトを非表示:
.chat-gift-message { display: none !important; }

接続状態を表示:
.chat-status {
  display: block !important;
  color: #ffffff;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.8);
}

メッセージにアニメーションを追加:
.chat-message { animation: chat-message-in 200ms ease-out both; }
@keyframes chat-message-in {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
*/`,
  },
};
