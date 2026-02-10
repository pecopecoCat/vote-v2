/**
 * ブックマークコレクション（Bookmark TOP のリスト・カード登録先）
 * localStorage で永続化。
 */

const STORAGE_KEY = "vote_collections";
const PINNED_STORAGE_KEY = "vote_pinned_collection_ids";
const EVENT_NAME = "vote_collections_updated";
export const PINNED_UPDATED_EVENT = "vote_pinned_collections_updated";

export type CollectionVisibility = "member" | "public" | "private";

export interface Collection {
  id: string;
  name: string;
  /** カード用アイコンの背景色（例: #FFB6C1） */
  color: string;
  visibility: CollectionVisibility;
  cardIds: string[];
}

const DEFAULT_COLLECTIONS: Collection[] = [
  { id: "col-1", name: "いつものメンバ専用✨", color: "#FFB6C1", visibility: "member", cardIds: [] },
  { id: "col-2", name: "映画好きの2択", color: "#FFB347", visibility: "public", cardIds: [] },
  { id: "col-3", name: "おきにいり", color: "#87CEEB", visibility: "public", cardIds: [] },
  { id: "col-4", name: "推しのトピック", color: "#DDA0DD", visibility: "private", cardIds: [] },
];

function load(): Collection[] {
  if (typeof window === "undefined") return [...DEFAULT_COLLECTIONS];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [...DEFAULT_COLLECTIONS];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [...DEFAULT_COLLECTIONS];
    return parsed.map((c: Record<string, unknown>) => ({
      id: String(c.id ?? ""),
      name: String(c.name ?? ""),
      color: String(c.color ?? "#E5E7EB"),
      visibility: (c.visibility as CollectionVisibility) ?? "public",
      cardIds: Array.isArray(c.cardIds) ? (c.cardIds as string[]) : [],
    }));
  } catch {
    return [...DEFAULT_COLLECTIONS];
  }
}

function save(collections: Collection[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(collections));
    window.dispatchEvent(new CustomEvent(EVENT_NAME));
  } catch {
    // ignore
  }
}

/** 全コレクションを取得 */
export function getCollections(): Collection[] {
  return load();
}

/** 更新時に発火するイベント名 */
export function getCollectionsUpdatedEventName(): string {
  return EVENT_NAME;
}

/** コレクションを保存（上書き） */
export function saveCollections(collections: Collection[]): void {
  save(collections);
}

/** カードがどのコレクションにも含まれているか */
export function isCardInAnyCollection(cardId: string): boolean {
  const cols = load();
  return cols.some((c) => c.cardIds.includes(cardId));
}

/** 全ブックマークカードID（全コレクションの和集合） */
export function getAllBookmarkedCardIds(): string[] {
  const cols = load();
  const set = new Set<string>();
  cols.forEach((c) => c.cardIds.forEach((id) => set.add(id)));
  return Array.from(set);
}

/** カードをコレクションに追加 */
export function addCardToCollection(collectionId: string, cardId: string): void {
  const cols = load();
  const col = cols.find((c) => c.id === collectionId);
  if (!col || col.cardIds.includes(cardId)) return;
  col.cardIds.push(cardId);
  save(cols);
}

/** カードをコレクションから削除 */
export function removeCardFromCollection(collectionId: string, cardId: string): void {
  const cols = load();
  const col = cols.find((c) => c.id === collectionId);
  if (!col) return;
  col.cardIds = col.cardIds.filter((id) => id !== cardId);
  save(cols);
}

/** コレクションに含まれるかトグル */
export function toggleCardInCollection(collectionId: string, cardId: string): void {
  const cols = load();
  const col = cols.find((c) => c.id === collectionId);
  if (!col) return;
  if (col.cardIds.includes(cardId)) {
    col.cardIds = col.cardIds.filter((id) => id !== cardId);
  } else {
    col.cardIds.push(cardId);
  }
  save(cols);
}

/** 新規コレクション作成（名前必須、色・公開設定はオプション） */
export function createCollection(
  name: string,
  options?: { color?: string; visibility?: CollectionVisibility }
): Collection {
  const cols = load();
  const id = `col-${Date.now()}`;
  const newCol: Collection = {
    id,
    name: name.trim() || "新しいコレクション",
    color: options?.color ?? "#87CEEB",
    visibility: options?.visibility ?? "public",
    cardIds: [],
  };
  cols.push(newCol);
  save(cols);
  return newCol;
}

/** コレクションを更新（名前・色・公開設定） */
export function updateCollection(
  id: string,
  updates: { name?: string; color?: string; visibility?: CollectionVisibility }
): void {
  const cols = load();
  const col = cols.find((c) => c.id === id);
  if (!col) return;
  if (updates.name !== undefined) col.name = updates.name.trim() || col.name;
  if (updates.color !== undefined) col.color = updates.color;
  if (updates.visibility !== undefined) col.visibility = updates.visibility;
  save(cols);
}

/** コレクションを削除 */
export function deleteCollection(id: string): void {
  const cols = load().filter((c) => c.id !== id);
  save(cols);
  const pinned = getPinnedCollectionIds().filter((pid) => pid !== id);
  if (pinned.length < getPinnedCollectionIds().length) savePinnedIds(pinned);
}

function loadPinnedIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(PINNED_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.map((id) => String(id)) : [];
  } catch {
    return [];
  }
}

function savePinnedIds(ids: string[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PINNED_STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // ignore
  }
}

/** 検索画面にピン留めしたコレクションID一覧 */
export function getPinnedCollectionIds(): string[] {
  return loadPinnedIds();
}

/** コレクションがピン留めされているか */
export function isPinnedCollection(collectionId: string): boolean {
  return loadPinnedIds().includes(collectionId);
}

/** ピン留めをトグル（検索画面にピン留め） */
export function togglePinnedCollection(collectionId: string): void {
  const current = loadPinnedIds();
  const has = current.includes(collectionId);
  const next = has ? current.filter((id) => id !== collectionId) : [...current, collectionId];
  savePinnedIds(next);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(PINNED_UPDATED_EVENT));
  }
}
