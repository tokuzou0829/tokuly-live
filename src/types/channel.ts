import { LiveList } from "./live";

export type Channels = {
  channels: ListChannel[];
};

export type ListChannel = {
  name: string;
  icon_url: string;
  handle: string;
  now_stream: boolean;
  game: string;
};

export type Channel = {
  id: string;
  name: string;
  handle: string;
  banner_url: string;
  icon_url: string;
  self_introduction: string;
  game: string;
  streams: LiveList[];
  waiting: LiveList[];
  archives: LiveList[];
  videos: LiveList[];
  thumbnail_url: string;
};

type Stream = {
  title: string;
  thumbnail_url: string;
  stream_name: string;
};
