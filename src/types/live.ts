export type LiveProps = {
  id: string;
};

export type Live = {
  id: number;
  title: string;
  status: string;
  stream_name: string;
  thumbnail_url: string;
  static_thumbnail_url: string;
  stream_overview: string;
  archive: boolean;
  stream_start_time: string;
  publishing_setting: string;
  ch_name: string;
  ch_icon: string;
  ch_handle: string;
};

export type MoreVideoList = {
  id: number;
  title: string;
  status: string;
  stream_name: string;
  thumbnail_url: string;
  type: string;
  static_thumbnail_url: string;
  stream_overview: string;
  stream_start_time: string;
  publishing_setting: string;
  ch_name: string;
  ch_icon: string;
  ch_handle: string;
};

export type LiveList = {
  id: number;
  title: string;
  type: "live" | "archive" | "live_waiting" | "video";
  stream_name: string;
  thumbnail_url: string;
  ch_name: string;
  ch_icon: string;
  ch_handle: string;
};
