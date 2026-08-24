export type PlaybackContentType = "video" | "archive" | "clip";

export type PlaybackSessionStartInput = {
  content_type: PlaybackContentType;
  content_key: string;
  client_session_id: string;
  viewer_channel_id?: number;
  position_ms: number;
};

export type PlaybackSessionStartResult = {
  playback_session_id: string;
  counted: boolean;
  view_count: number;
  viewer_token?: string | null;
};

export type PlaybackSessionRestoreInput = {
  content_type: PlaybackContentType;
  content_key: string;
  viewer_channel_id?: number;
};

export type PlaybackSessionRestoreResult = {
  playback_session_id: string;
  resume_position_ms: number;
  view_count: number;
};

export type PlaybackProgressState = "playing" | "paused";

export type PlaybackProgressInput = {
  position_ms: number;
  state: PlaybackProgressState;
};

export type PlaybackFinishReason = "ended" | "pagehide" | "navigation" | "error";

export type PlaybackFinishInput = {
  position_ms: number;
  reason: PlaybackFinishReason;
};

export type WatchHistoryContent = {
  content_type: PlaybackContentType;
  content_key: string;
  title: string;
  thumbnail_url: string | null;
  duration_seconds: number | null;
  channel_name: string | null;
  channel_handle: string | null;
  view_count?: number;
};

export type WatchHistoryItem = WatchHistoryContent & {
  resume_position_ms: number;
  total_watched_seconds: number;
  completed: boolean;
  completed_at: string | null;
  last_watched_at: string;
};

export type WatchHistoryPage = {
  data: WatchHistoryItem[];
  links: { first?: string; last?: string; prev?: string | null; next?: string | null };
  meta: {
    current_page: number;
    from: number | null;
    last_page: number;
    per_page: number;
    to: number | null;
    total: number;
  };
};
