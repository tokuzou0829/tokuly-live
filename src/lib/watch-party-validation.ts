import type {
  WatchPartyAck,
  WatchPartyError,
  WatchPartyJoinResult,
  WatchPartyMessage,
  WatchPartyParticipant,
  WatchPartyPlayback,
} from "@/types/watch-party";

const MAX_USERS = 100;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isBoundedString(value: unknown, maximum: number, allowEmpty = false): value is string {
  return (
    typeof value === "string" && value.length <= maximum && (allowEmpty || value.trim().length > 0)
  );
}

export function parseWatchPartyError(value: unknown): WatchPartyError | null {
  if (!isRecord(value)) return null;
  if (!isBoundedString(value.code, 64) || !isBoundedString(value.message, 500)) return null;
  return { code: value.code, message: value.message };
}

export function parseWatchPartyParticipant(value: unknown): WatchPartyParticipant | null {
  if (!isRecord(value)) return null;
  if (
    !isBoundedString(value.id, 128) ||
    !isBoundedString(value.name, 100) ||
    !isBoundedString(value.image, 2048, true) ||
    (value.role !== "host" && value.role !== "participant")
  ) {
    return null;
  }
  return { id: value.id, image: value.image, name: value.name, role: value.role };
}

export function parseWatchPartyPlayback(value: unknown): WatchPartyPlayback | null {
  if (!isRecord(value)) return null;
  if (
    !Number.isFinite(value.currentTime) ||
    (value.currentTime as number) < 0 ||
    typeof value.playing !== "boolean" ||
    !Number.isSafeInteger(value.serverTime) ||
    (value.serverTime as number) < 0
  ) {
    return null;
  }
  return {
    currentTime: value.currentTime as number,
    playing: value.playing,
    serverTime: value.serverTime as number,
  };
}

export function parseWatchPartyMessage(value: unknown): WatchPartyMessage | null {
  if (!isRecord(value)) return null;
  if (
    !isBoundedString(value.id, 128) ||
    !isBoundedString(value.image, 2048, true) ||
    !isBoundedString(value.name, 100) ||
    !isBoundedString(value.text, 500) ||
    !Number.isSafeInteger(value.sentAt) ||
    (value.sentAt as number) < 0
  ) {
    return null;
  }
  return {
    id: value.id,
    image: value.image,
    name: value.name,
    sentAt: value.sentAt as number,
    text: value.text,
  };
}

export function parseWatchPartyUsers(value: unknown): WatchPartyParticipant[] | null {
  if (!Array.isArray(value) || value.length > MAX_USERS) return null;
  const users = value.map(parseWatchPartyParticipant);
  return users.every((user): user is WatchPartyParticipant => user !== null) ? users : null;
}

export function parseWatchPartyJoinResult(value: unknown): WatchPartyJoinResult | null {
  if (!isRecord(value)) return null;
  const playback = parseWatchPartyPlayback(value.playback);
  const self = parseWatchPartyParticipant(value.self);
  const users = parseWatchPartyUsers(value.users);
  if (
    !playback ||
    !self ||
    !users ||
    !Number.isSafeInteger(value.serverTime) ||
    (value.serverTime as number) < 0 ||
    !users.some((user) => user.id === self.id)
  ) {
    return null;
  }
  return { playback, self, serverTime: value.serverTime as number, users };
}

export function parseWatchPartyAck<T>(
  value: unknown,
  parseData: (data: unknown) => T | null
): WatchPartyAck<T> | null {
  if (!isRecord(value) || typeof value.ok !== "boolean") return null;
  if (value.ok) {
    const data = parseData(value.data);
    return data === null ? null : { ok: true, data };
  }
  const error = parseWatchPartyError(value.error);
  return error ? { ok: false, error } : null;
}
