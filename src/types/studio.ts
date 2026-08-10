export type StudioPagination = {
  current_page: number;
  from: number | null;
  last_page: number;
  path: string;
  per_page: number;
  to: number | null;
  total: number;
};

export type StudioPage<T> = {
  data: T[];
  links: { first?: string; last?: string; prev?: string | null; next?: string | null };
  meta: StudioPagination;
};

export type StudioChannel = {
  id: number;
  name: string;
  handle: string;
  self_introduction: string | null;
  icon_url: string | null;
  banner_url: string | null;
  gifts_enabled: boolean;
  public_url: string;
  channel_password?: string;
  created_at: string;
  updated_at: string;
};

export type StudioStreamStatus = "offline" | "online" | "end" | "video";
export type StudioPublishingSetting = "public" | "hidden_from_feed" | "link" | "friend";

export type StudioStream = {
  id: number;
  channel_id: number;
  type: "live" | "video";
  title: string;
  status: StudioStreamStatus;
  stream_key: string;
  stream_key_secret?: string;
  thumbnail_url: string | null;
  live_thumbnail: boolean;
  publishing_setting: StudioPublishingSetting;
  overview: string | null;
  genre: "game" | "talk" | "music" | "other" | null;
  game: { igdb_id: string; name: string; image_url: string | null } | null;
  gifts_enabled: boolean;
  recording: boolean;
  allow_rewind: boolean;
  duration_seconds: number;
  video: {
    width: number | null;
    height: number | null;
    fps: number | null;
    processing_state: string | null;
  };
  urls: { public: string; chat_embed: string; browser_encoder: string };
  stream_started_at: string | null;
  stream_ended_at: string | null;
  created_at: string;
  updated_at: string;
};

export type StudioSubtitle = {
  id: number;
  language_code: string;
  label: string;
  format: "vtt";
  original_format: "vtt" | "srt";
  url: string;
};

export type StudioSubtitlesResponse = { data: StudioSubtitle[]; can_upload: boolean };

export type ListenerAnalytics = {
  summary: {
    current_count: number;
    peak_concurrent: number;
    peak_at: string | null;
    unique_listeners: number;
    total_listening_seconds: number;
    started_at: string | null;
    ended_at: string | null;
    finalized: boolean;
  } | null;
  timeline: Array<{
    timestamp: string;
    elapsed_seconds: number;
    concurrent_listeners: number;
    cumulative_unique_listeners: number;
  }>;
};

export type UploadSession = {
  id: number;
  session_id: string;
  stream_id: number;
  file_type: "video";
  state: string;
  created_at: string;
  updated_at: string;
};

export type ReceivedStudioGift = {
  id: number;
  amount: number;
  comment: string | null;
  display_style: string;
  sender: {
    id: number;
    type: string;
    channel_id: number | null;
    name: string;
    handle: string;
    profile_photo_url: string | null;
  };
  live_stream: Pick<StudioStream, "id" | "title" | "stream_key" | "status"> | null;
  accessed_at: string | null;
  received_at: string;
};

export type SentStudioGiftAttempt = {
  id: number;
  amount: number;
  status: string | null;
  accessed_at: string | null;
  received_at: string | null;
  returnable: boolean;
};

export type SentStudioGift = {
  id: number;
  gift_id: string;
  recipient_channel: { id: number; name: string; handle: string };
  live_stream: Pick<StudioStream, "id" | "title" | "stream_key" | "status"> | null;
  provider: string;
  expected_amount: number;
  comment: string | null;
  display_style: string;
  status: string;
  expires_at: string | null;
  completed_at: string | null;
  created_at: string;
  attempts: SentStudioGiftAttempt[];
};

export type GameResult = {
  id: number;
  name: string;
  cover_url: string | null;
  cover_image_id: string | null;
};

