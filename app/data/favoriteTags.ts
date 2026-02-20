/**
 * ユーザーお気に入りタグ（mypage・検索画面で共通。ハートで追加・削除）
 * user1 / user2 / ゲストごとに localStorage で保持。
 */

import { getCurrentActivityUserId } from "./auth";

const STORAGE_KEY_PREFIX = "vote_favorite_tags_";
const LEGACY_KEY = "vote_favorite_tags";
const EVENT_NAME = "vote_favorite_tags_updated";

function getStorageKey(): string {
  return STORAGE_KEY_PREFIX + getCurrentActivityUserId();
}

function load(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const key = getStorageKey();
    let raw = window.localStorage.getItem(key);
    if (!raw && (key.includes("user1") || key.includes("user2"))) {
      raw = window.localStorage.getItem(LEGACY_KEY);
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as unknown;
          if (Array.isArray(parsed)) {
            const tags = parsed.filter((t): t is string => typeof t === "string" && t.length > 0);
            window.localStorage.setItem(key, JSON.stringify(tags));
            window.localStorage.removeItem(LEGACY_KEY);
            return tags;
          }
        } catch {
          // ignore
        }
      }
    }
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((t): t is string => typeof t === "string" && t.length > 0);
  } catch {
    return [];
  }
}

function save(tags: string[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(getStorageKey(), JSON.stringify(tags));
    window.dispatchEvent(new CustomEvent(EVENT_NAME));
  } catch {
    // ignore
  }
}

/** お気に入りタグ一覧を取得（初回・未登録時は 0 件） */
export function getFavoriteTags(): string[] {
  return load();
}

/** お気に入りタグ更新時に発火するイベント名（mypage などで購読して UI を更新する用） */
export function getFavoriteTagsUpdatedEventName(): string {
  return EVENT_NAME;
}

/** お気に入りに追加（重複は登録しない） */
export function addFavoriteTag(tag: string): void {
  const t = tag.trim();
  if (!t) return;
  const list = load();
  const lower = t.toLowerCase();
  if (list.some((x) => x.toLowerCase() === lower)) return;
  save([...list, t]);
}

/** お気に入りから削除 */
export function removeFavoriteTag(tag: string): void {
  const t = tag.trim();
  if (!t) return;
  const list = load();
  const lower = t.toLowerCase();
  save(list.filter((x) => x.toLowerCase() !== lower));
}

/** お気に入りかどうか */
export function isFavoriteTag(tag: string): boolean {
  const t = tag.trim();
  if (!t) return false;
  const list = load();
  const lower = t.toLowerCase();
  return list.some((x) => x.toLowerCase() === lower);
}

/** トグル（登録済みなら削除、未登録なら追加） */
export function toggleFavoriteTag(tag: string): boolean {
  const t = tag.trim();
  if (!t) return false;
  if (isFavoriteTag(t)) {
    removeFavoriteTag(t);
    return false;
  }
  addFavoriteTag(t);
  return true;
}
