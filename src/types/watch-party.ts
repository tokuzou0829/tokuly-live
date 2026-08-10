export type WatchPartyRole = "host" | "participant";

export type WatchPartyParticipant = {
  id: string;
  image: string;
  name: string;
  role: WatchPartyRole;
};

export type WatchPartyPlayback = {
  currentTime: number;
  playing: boolean;
  serverTime: number;
};

export type WatchPartyMessage = {
  id: string;
  image: string;
  name: string;
  sentAt: number;
  text: string;
};

export type WatchPartyError = {
  code: string;
  message: string;
};

export type WatchPartyAck<T> = { ok: true; data: T } | { ok: false; error: WatchPartyError };

export type WatchPartyJoinResult = {
  playback: WatchPartyPlayback;
  serverTime: number;
  self: WatchPartyParticipant;
  users: WatchPartyParticipant[];
};
