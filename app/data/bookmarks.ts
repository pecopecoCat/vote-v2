/**
 * Bookmark（ブックマーク登録）
 * 概念: ユーザーが保存したVOTE CARDの一覧。まとめたいものをCOLLECTIONに登録する。
 * ユーザーごとに localStorage で永続化。
 */

import { getAuth, getCurrentActivityUserId } from "./auth";

const STORAGE_KEY_PREFIX = "vote_bookmark_ids_";
const COLLECTIONS_KEY_PREFIX = "vote_collections_";
const EVENT_NAME = "vote_bookmarks_updated";
const BOOKMARK_EVENTS_KEY = "vote_bookmark_events";
const MAX_BOOKMARK_EVENTS = 100;
const REMOTE_API = "/api/bookmarks";

/** ブックマークイベント（作成者向けお知らせ「作成した2択がブックマークされました」用） */
export interface BookmarkEvent {
  cardId: string;
  date: string;
}

function loadBookmarkEvents(): BookmarkEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(BOOKMARK_EVENTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as BookmarkEvent[]) : [];
  } catch {
    return [];
  }
}

function saveBookmarkEvents(events: BookmarkEvent[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(BOOKMARK_EVENTS_KEY, JSON.stringify(events.slice(-MAX_BOOKMARK_EVENTS)));
  } catch {
    // ignore
  }
}

/** ブックマークイベント一覧を取得（作成者向けお知らせ用・日付降順） */
export function getBookmarkEvents(): BookmarkEvent[] {
  const events = loadBookmarkEvents();
  return [...events].sort((a, b) => (b.date || "").localeCompare(a.date || ""));
}

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

function saveRemoteIfLoggedIn(ids: string[]): void {
  const auth = getAuth();
  if (!auth.isLoggedIn || !auth.userId) return;
  fetch(REMOTE_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId: auth.userId, ids }),
  }).catch(() => {});
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
  const next = [...ids, cardId];
  save(userId, next);
  saveRemoteIfLoggedIn(next);
  const events = loadBookmarkEvents();
  events.push({ cardId, date: new Date().toISOString() });
  saveBookmarkEvents(events);
}

/** Bookmarkから削除（コレクションからも一括削除する場合は collections 側で行う） */
export function removeBookmark(cardId: string): void {
  const userId = getCurrentActivityUserId();
  const next = load(userId).filter((id) => id !== cardId);
  save(userId, next);
  saveRemoteIfLoggedIn(next);
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

/** KVに保存されたブックマークID一覧を取り込み（ログインユーザーのみ）。 */
export async function hydrateBookmarksFromRemote(): Promise<void> {
  if (typeof window === "undefined") return;
  const auth = getAuth();
  if (!auth.isLoggedIn || !auth.userId) return;
  try {
    const res = await fetch(`${REMOTE_API}?userId=${encodeURIComponent(auth.userId)}`);
    if (!res.ok) return;
    const data = (await res.json()) as { ids?: unknown };
    const ids = Array.isArray(data?.ids) ? data.ids.filter((v): v is string => typeof v === "string" && v.length > 0) : [];
    // このブラウザの currentActivityUserId に保存（デモ環境は userId = currentActivityUserId の想定）
    save(getCurrentActivityUserId(), ids);
  } catch {
    // ignore
  }
}
