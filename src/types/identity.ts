export type UserPostingIdentity = {
  type: "user";
  accountId: string;
  name: string;
  handle: string;
  profilePhotoUrl: string | null;
};

export type ChannelPostingIdentity = {
  type: "channel";
  accountId: string;
  channelId: number;
  name: string;
  handle: string;
  profilePhotoUrl: string;
};

export type PostingIdentity = UserPostingIdentity | ChannelPostingIdentity;

export type MainChannelResponse = {
  result: "ok";
  id: number;
  name: string;
  handle: string;
  icon: string;
  channel_password: string;
};

export type OwnedChannel = {
  id: number;
  name: string;
  handle: string;
  profile_photo_url: string;
};

export type OwnedChannelsResponse = {
  data: OwnedChannel[];
};
