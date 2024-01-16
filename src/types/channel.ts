export type Channels = {
  channels: Channel[];
};

export type Channel = {
  name: string;
  icon_url: string;
  handle: string;
  now_stream: boolean;
  game: string;
};
