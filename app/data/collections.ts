/**
 * ブックマークコレクション（COLLECTION）
 * 関係図: ログイン後のユーザーが作ることができる。管理も作成ユーザーのみ。
 * 公開設定により、全員がみれたり・個人だけ・リンクを知っているメンバのみ見れる（public / private / member）。
 * ユーザーごとに localStorage で永続化。マイページには「そのユーザーが作った」コレクションのみ表示。
 */

import type { CollectionGradient } from "./search";
import { getCurrentActivityUserId } from "./auth";
import { addBookmark } from "./bookmarks";

const STORAGE_KEY_PREFIX = "vote_collections_";
const PINNED_STORAGE_KEY_PREFIX = "vote_pinned_collection_ids_";
const LEGACY_STORAGE_KEY = "vote_collections";
const LEGACY_PINNED_KEY = "vote_pinned_collection_ids";
const EVENT_NAME = "vote_collections_updated";
export const PINNED_UPDATED_EVENT = "vote_pinned_collections_updated";

export type CollectionVisibility = "member" | "public" | "private";

export interface Collection {
  id: string;
  name: string;
  /** カード用アイコンの背景色（グラデーション未設定時のフォールバック） */
  color: string;
  /** 背景グラデーション（Bookmark/検索/MyPage/設定で共通。未設定時は color で表示） */
  gradient?: CollectionGradient;
  visibility: CollectionVisibility;
  cardIds: string[];
}

function normalizeCollection(c: Record<string, unknown>): Collection {
  return {
    id: String(c.id ?? ""),
    name: String(c.name ?? ""),
    color: String(c.color ?? "#E5E7EB"),
    gradient: c.gradient as CollectionGradient | undefined,
    visibility: (c.visibility as CollectionVisibility) ?? "public",
    cardIds: Array.isArray(c.cardIds) ? (c.cardIds as string[]) : [],
  };
}

/** ユーザーごとのコレクションを読み込み（作ったものだけ。初回は空 or 旧キーから1回だけ移行） */
function load(userId: string): Collection[] {
  if (typeof window === "undefined") return [];
  try {
    const key = STORAGE_KEY_PREFIX + userId;
    let raw = window.localStorage.getItem(key);
    if (!raw) {
      raw = window.localStorage.getItem(LEGACY_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as unknown;
        if (Array.isArray(parsed)) {
          const migrated = parsed.map((c: Record<string, unknown>) => normalizeCollection(c));
          window.localStorage.setItem(key, JSON.stringify(migrated));
          return migrated;
        }
      }
      return [];
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.map((c: Record<string, unknown>) => normalizeCollection(c));
  } catch {
    return [];
  }
}

function save(userId: string, collections: Collection[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY_PREFIX + userId, JSON.stringify(collections));
    window.dispatchEvent(new CustomEvent(EVENT_NAME));
  } catch {
    // ignore
  }
}

/** 現在のユーザーが作ったコレクション一覧を取得（マイページで表示する用） */
export function getCollections(): Collection[] {
  return load(getCurrentActivityUserId());
}

/** user1 と user2 のブックマークコレクションを空にリセット（一旦0にする用） */
export function resetUser1AndUser2Collections(): void {
  if (typeof window === "undefined") return;
  try {
    for (const userId of ["user1", "user2"]) {
      window.localStorage.removeItem(STORAGE_KEY_PREFIX + userId);
      window.localStorage.removeItem(PINNED_STORAGE_KEY_PREFIX + userId);
    }
    window.dispatchEvent(new CustomEvent(EVENT_NAME));
    window.dispatchEvent(new CustomEvent(PINNED_UPDATED_EVENT));
  } catch {
    // ignore
  }
}

/** 更新時に発火するイベント名 */
export function getCollectionsUpdatedEventName(): string {
  return EVENT_NAME;
}

/** コレクションを保存（上書き・現在ユーザー分のみ） */
export function saveCollections(collections: Collection[]): void {
  save(getCurrentActivityUserId(), collections);
}

/** カードが現在ユーザーのいずれかのコレクションに含まれているか */
export function isCardInAnyCollection(cardId: string): boolean {
  const cols = load(getCurrentActivityUserId());
  return cols.some((c) => c.cardIds.includes(cardId));
}

/** 現在ユーザーの全ブックマークカードID（作ったコレクションの和集合） */
export function getAllBookmarkedCardIds(): string[] {
  const cols = load(getCurrentActivityUserId());
  const set = new Set<string>();
  cols.forEach((c) => c.cardIds.forEach((id) => set.add(id)));
  return Array.from(set);
}

/** カードをコレクションに追加（Bookmarkにも登録する） */
export function addCardToCollection(collectionId: string, cardId: string): void {
  const userId = getCurrentActivityUserId();
  const cols = load(userId);
  const col = cols.find((c) => c.id === collectionId);
  if (!col || col.cardIds.includes(cardId)) return;
  col.cardIds.push(cardId);
  save(userId, cols);
  addBookmark(cardId);
}

/** カードをコレクションから削除 */
export function removeCardFromCollection(collectionId: string, cardId: string): void {
  const userId = getCurrentActivityUserId();
  const cols = load(userId);
  const col = cols.find((c) => c.id === collectionId);
  if (!col) return;
  col.cardIds = col.cardIds.filter((id) => id !== cardId);
  save(userId, cols);
}

/** コレクションに含まれるかトグル（追加時はBookmarkにも登録） */
export function toggleCardInCollection(collectionId: string, cardId: string): void {
  const userId = getCurrentActivityUserId();
  const cols = load(userId);
  const col = cols.find((c) => c.id === collectionId);
  if (!col) return;
  if (col.cardIds.includes(cardId)) {
    col.cardIds = col.cardIds.filter((id) => id !== cardId);
  } else {
    col.cardIds.push(cardId);
    addBookmark(cardId);
  }
  save(userId, cols);
}

/** 新規コレクション作成（現在ユーザーが作る。名前必須） */
export function createCollection(
  name: string,
  options?: { color?: string; gradient?: CollectionGradient; visibility?: CollectionVisibility }
): Collection {
  const userId = getCurrentActivityUserId();
  const cols = load(userId);
  const id = `col-${Date.now()}`;
  const newCol: Collection = {
    id,
    name: name.trim() || "新しいコレクション",
    color: options?.color ?? "#87CEEB",
    gradient: options?.gradient,
    visibility: options?.visibility ?? "public",
    cardIds: [],
  };
  cols.push(newCol);
  save(userId, cols);
  return newCol;
}

/** コレクションを更新（名前・色・グラデーション・公開設定） */
export function updateCollection(
  id: string,
  updates: { name?: string; color?: string; gradient?: CollectionGradient; visibility?: CollectionVisibility }
): void {
  const userId = getCurrentActivityUserId();
  const cols = load(userId);
  const col = cols.find((c) => c.id === id);
  if (!col) return;
  if (updates.name !== undefined) col.name = updates.name.trim() || col.name;
  if (updates.color !== undefined) col.color = updates.color;
  if (updates.gradient !== undefined) col.gradient = updates.gradient;
  if (updates.visibility !== undefined) col.visibility = updates.visibility;
  save(userId, cols);
}

/** コレクションを削除 */
export function deleteCollection(id: string): void {
  const userId = getCurrentActivityUserId();
  const cols = load(userId).filter((c) => c.id !== id);
  save(userId, cols);
  const pinned = getPinnedCollectionIds().filter((pid) => pid !== id);
  if (pinned.length < getPinnedCollectionIds().length) savePinnedIds(userId, pinned);
}

function loadPinnedIds(userId: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const key = PINNED_STORAGE_KEY_PREFIX + userId;
    let raw = window.localStorage.getItem(key);
    if (!raw) {
      raw = window.localStorage.getItem(LEGACY_PINNED_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as unknown;
        if (Array.isArray(parsed)) {
          const ids = parsed.map((id: unknown) => String(id));
          window.localStorage.setItem(key, JSON.stringify(ids));
          return ids;
        }
      }
      return [];
    }
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.map((id: unknown) => String(id)) : [];
  } catch {
    return [];
  }
}

function savePinnedIds(userId: string, ids: string[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PINNED_STORAGE_KEY_PREFIX + userId, JSON.stringify(ids));
  } catch {
    // ignore
  }
}

/** 検索画面にピン留めしたコレクションID一覧（現在ユーザー分） */
export function getPinnedCollectionIds(): string[] {
  return loadPinnedIds(getCurrentActivityUserId());
}

/** コレクションがピン留めされているか */
export function isPinnedCollection(collectionId: string): boolean {
  return loadPinnedIds(getCurrentActivityUserId()).includes(collectionId);
}

/** ピン留めをトグル（検索画面にピン留め） */
export function togglePinnedCollection(collectionId: string): void {
  const userId = getCurrentActivityUserId();
  const current = loadPinnedIds(userId);
  const has = current.includes(collectionId);
  const next = has ? current.filter((id) => id !== collectionId) : [...current, collectionId];
  savePinnedIds(userId, next);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(PINNED_UPDATED_EVENT));
  }
}
