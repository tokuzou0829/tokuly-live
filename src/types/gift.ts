export type GiftDisplayStyle =
  | "blue"
  | "cyan"
  | "light-green"
  | "yellow"
  | "orange"
  | "magenta"
  | "red"
  | "black"
  | "rainbow";

export type GiftTier = {
  min: number;
  max: number;
  displayStyle: GiftDisplayStyle;
  maxCommentLength: number;
};

export type CreateGiftSessionInput = {
  channel_id: number;
  sender_channel_id?: number;
  live_stream_id: number;
  amount: number;
  comment: string;
};

export type CreatedGiftSession = {
  gift_id: string;
  gift_email: string;
  expected_amount: number;
  comment: string | null;
  display_style: GiftDisplayStyle;
  expires_at: string | null;
  valid_while_stream_online: boolean;
};

export type ChatItemNormal = {
  type: "chat";
  id: number | string | null;
  image?: string | null;
  name: string;
  text: string;
};

export type ChatItemGift = {
  type: "gift";
  id: number | string;
  image?: string | null;
  name: string;
  text: string;
  amount: number;
  provider: "amazon" | string;
  display_style: GiftDisplayStyle;
  completed_at: string;
};

export type ChatItem = ChatItemNormal | ChatItemGift;

export type GiftHistoryChannel = {
  id?: number | string;
  name?: string;
  handle?: string;
};

export type GiftHistoryStream = {
  id?: number | string;
  title?: string;
  stream_name?: string;
};

export type GiftAttempt = {
  id: number | string;
  amount: number;
  status?: "completed" | "amount_mismatch" | "session_expired" | "session_already_completed";
  returnable?: boolean;
  gift_complete?: boolean;
  failure_reason?: "amount_mismatch" | "session_expired" | "session_already_completed" | null;
  accessed_at: string | null;
  received_at?: string | null;
  created_at?: string | null;
};

export type SentGiftSession = {
  id: number | string;
  gift_id?: string;
  expected_amount: number;
  comment: string | null;
  display_style: GiftDisplayStyle;
  status: "pending" | "completed" | "expired";
  expires_at: string | null;
  completed_at: string | null;
  created_at?: string | null;
  recipient_channel?: GiftHistoryChannel | null;
  channel?: GiftHistoryChannel | null;
  live_stream?: GiftHistoryStream | null;
  stream?: GiftHistoryStream | null;
  gifts?: GiftAttempt[];
  attempts?: GiftAttempt[];
  received_attempts?: GiftAttempt[];
};

export type SentGiftPage = {
  data: SentGiftSession[];
  currentPage: number;
  lastPage: number;
  total: number;
};

export type ReturnGiftResponse = {
  claim_url?: string;
  claimUrl?: string;
};
