import {
  DEFAULT_AI_AVATAR_URL,
  DEFAULT_KOUTA_AVATAR_URL,
  DEFAULT_MAMA_AVATAR_URL,
  DEFAULT_PAPA_AVATAR_URL,
  DEFAULT_RYO_AVATAR_URL,
  DEFAULT_YUI_AVATAR_URL,
} from "./avatarUrls";

/** デモ userId → 既定アイコン（サーバー API でも利用） */
export const DEMO_USER_ICON_URLS: Record<string, string> = {
  user1: DEFAULT_MAMA_AVATAR_URL,
  user2: DEFAULT_PAPA_AVATAR_URL,
  user3: DEFAULT_AI_AVATAR_URL,
  user4: DEFAULT_KOUTA_AVATAR_URL,
  user5: DEFAULT_RYO_AVATAR_URL,
  user6: DEFAULT_YUI_AVATAR_URL,
};

/** localStorage / KV の参加者行に載せてよい最大長（data URL 等で他参加者が保存できなくなるのを防ぐ） */
export const MAX_PARTICIPANT_ICON_URL_LEN = 512;

export function pickStoredIconUrl(iconUrl?: string): string | undefined {
  if (typeof iconUrl !== "string") return undefined;
  const v = iconUrl.trim();
  if (!v || v === "undefined" || v === "null") return undefined;
  return v;
}

/** 参加者の永続化用。data URL や巨大 URL は保存しない（表示は resolveParticipantIconUrl で補完） */
export function stripIconForParticipantStorage(iconUrl?: string): string | undefined {
  const v = pickStoredIconUrl(iconUrl);
  if (!v) return undefined;
  if (v.startsWith("data:")) return undefined;
  if (v.length > MAX_PARTICIPANT_ICON_URL_LEN) return undefined;
  return v;
}

export function resolveDemoUserIconUrl(userId: string): string | undefined {
  return DEMO_USER_ICON_URLS[userId];
}

/** KV / 参加者行に保存された URL が無いときのフォールバック（ローカル保存プロフィールは含まない） */
export function resolveParticipantIconUrl(userId: string, stored?: string): string | undefined {
  return stripIconForParticipantStorage(stored) ?? resolveDemoUserIconUrl(userId);
}

export type ParticipantRowLite = {
  name: string;
  iconUrl?: string;
  lastVotedAt: string;
};

export function stripParticipantRowForStorage<T extends ParticipantRowLite>(row: T): T {
  const iconUrl = stripIconForParticipantStorage(row.iconUrl);
  return iconUrl ? { ...row, iconUrl } : { ...row, iconUrl: undefined };
}

export function stripParticipantsMapForStorage<T extends ParticipantRowLite>(
  map: Record<string, T>
): Record<string, T> {
  const out: Record<string, T> = {};
  for (const [uid, row] of Object.entries(map)) {
    out[uid] = stripParticipantRowForStorage(row);
  }
  return out;
}
