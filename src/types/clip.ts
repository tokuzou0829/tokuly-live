export type ClipChannel = {
  id: number;
  name: string;
  handle: string;
  icon_url: string | null;
};

export type ClipSourceVideo = {
  id: number;
  title: string;
  stream_key: string;
  type: "video" | "archive";
  thumbnail_url: string | null;
};

export type ClipResource = {
  clip_key: string;
  creator_channel_id: number;
  source_video_id: number;
  title: string;
  start_seconds: number;
  end_seconds: number;
  duration_seconds: number;
  thumbnail_url: string;
  creator_channel: ClipChannel | null;
  source_video: ClipSourceVideo;
  source_channel: ClipChannel | null;
  created_at: string;
};

export type ClipPagination = {
  current_page: number;
  from: number | null;
  last_page: number;
  per_page: number;
  to: number | null;
  total: number;
  path?: string;
};

export type ClipPage = {
  data: ClipResource[];
  links: {
    first?: string;
    last?: string;
    prev?: string | null;
    next?: string | null;
  };
  meta: ClipPagination;
};

export type CreateClipInput = {
  title: string;
  source_video_id: number;
  start_seconds: number;
  end_seconds: number;
};
