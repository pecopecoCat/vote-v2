/**
 * Bookmark（ブックマーク登録）
 * 概念: ユーザーが保存したVOTE CARDの一覧。まとめたいものをCOLLECTIONに登録する。
 * ユーザーごとに localStorage で永続化。
 */

import { getCurrentActivityUserId } from "./auth";

const STORAGE_KEY_PREFIX = "vote_bookmark_ids_";
const COLLECTIONS_KEY_PREFIX = "vote_collections_";
const EVENT_NAME = "vote_bookmarks_updated";

/** 既存ユーザー：コレクションの和集合をBookmarkに1回だけ移行 */
function tryMigrateFromCollections(userId: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(COLLECTIONS_KEY_PREFIX + userId);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const set = new Set<string>();
    for (const c of parsed as Array<{ cardIds?: string[] }>) {
      if (Array.isArray(c.cardIds)) c.cardIds.forEach((id) => set.add(String(id)));
    }
    return Array.from(set);
  } catch {
    return [];
  }
}

function load(userId: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY_PREFIX + userId);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is string => typeof id === "string");
  } catch {
    return [];
  }
}

function save(userId: string, ids: string[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY_PREFIX + userId, JSON.stringify(ids));
    window.dispatchEvent(new CustomEvent(EVENT_NAME));
  } catch {
    // ignore
  }
}

/** ブックマーク登録済みのカードID一覧（Bookmarkに登録されたVOTE CARD） */
export function getBookmarkIds(): string[] {
  const userId = getCurrentActivityUserId();
  let ids = load(userId);
  if (ids.length === 0) {
    const migrated = tryMigrateFromCollections(userId);
    if (migrated.length > 0) {
      save(userId, migrated);
      return migrated;
    }
  }
  return ids;
}

/** カードがBookmarkに登録されているか */
export function isCardBookmarked(cardId: string): boolean {
  return load(getCurrentActivityUserId()).includes(cardId);
}

/** Bookmarkに追加 */
export function addBookmark(cardId: string): void {
  const userId = getCurrentActivityUserId();
  const ids = load(userId);
  if (ids.includes(cardId)) return;
  save(userId, [...ids, cardId]);
}

/** Bookmarkから削除（コレクションからも一括削除する場合は collections 側で行う） */
export function removeBookmark(cardId: string): void {
  const userId = getCurrentActivityUserId();
  const ids = load(userId).filter((id) => id !== cardId);
  save(userId, ids);
}

export function getBookmarksUpdatedEventName(): string {
  return EVENT_NAME;
}

/** user1 と user2 のブックマークを空にリセット（コレクションクリア時と連動） */
export function resetUser1AndUser2Bookmarks(): void {
  if (typeof window === "undefined") return;
  try {
    for (const userId of ["user1", "user2"]) {
      window.localStorage.removeItem(STORAGE_KEY_PREFIX + userId);
    }
    window.dispatchEvent(new CustomEvent(EVENT_NAME));
  } catch {
    // ignore
  }
}
