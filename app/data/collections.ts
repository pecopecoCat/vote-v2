/**
 * ブックマークコレクション（COLLECTION）
 * 関係図: ログイン後のユーザーが作ることができる。管理も作成ユーザーのみ。
 * 公開設定により、全員がみれたり・個人だけ・リンクを知っているメンバのみ見れる（public / private / member）。
 * ユーザーごとに localStorage で永続化。マイページには「そのユーザーが作った」コレクションのみ表示。
 */

import type { CollectionGradient } from "./search";
import { getAuth, getCurrentActivityUserId } from "./auth";
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
  /** 他人のメンバー限定に参加しただけ（API 同期・削除はオーナー向けと分離） */
  joinedParticipation?: boolean;
  /** KV 同期時の作成者（参加判定用） */
  createdByUserId?: string;
  /** 作成者表示名（KV・一覧用。未設定時はクライアントで補完可） */
  createdByDisplayName?: string;
  /** 作成者アイコンURL */
  createdByIconUrl?: string;
}

function normalizeCollection(c: Record<string, unknown>): Collection {
  return {
    id: String(c.id ?? ""),
    name: String(c.name ?? ""),
    color: String(c.color ?? "#E5E7EB"),
    gradient: c.gradient as CollectionGradient | undefined,
    visibility: (c.visibility as CollectionVisibility) ?? "public",
    cardIds: Array.isArray(c.cardIds) ? (c.cardIds as string[]) : [],
    joinedParticipation: Boolean(c.joinedParticipation),
    createdByUserId: typeof c.createdByUserId === "string" ? c.createdByUserId : undefined,
    createdByDisplayName:
      typeof c.createdByDisplayName === "string" && c.createdByDisplayName.trim()
        ? c.createdByDisplayName.trim()
        : undefined,
    createdByIconUrl: typeof c.createdByIconUrl === "string" && c.createdByIconUrl.length > 0 ? c.createdByIconUrl : undefined,
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
    const normalized = parsed.map((c: Record<string, unknown>) => normalizeCollection(c));
    // 旧データ互換：オーナー作成のコレクションに createdByUserId が無い場合は現在ユーザーを補完
    return normalized.map((c) => {
      if (!c.joinedParticipation && !c.createdByUserId) {
        return { ...c, createdByUserId: userId };
      }
      return c;
    });
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

/** テストサイトuser以外が登録したコレクション（人気コレクション用・全員に表示） */
export const OTHER_USERS_COLLECTIONS: Collection[] = [
  { id: "other-1", name: "ここだけで聞いてみたい、相談VOTE", color: "#FF6389", gradient: "pink-purple", visibility: "public", cardIds: ["seed-1", "seed-2", "seed-5"] },
  { id: "other-2", name: "やっぱりこれ！定番の2択", color: "#707FED", gradient: "blue-cyan", visibility: "public", cardIds: ["seed-3", "seed-6", "seed-7", "seed-13"] },
  { id: "other-3", name: "推しを比べる2択", color: "#FF8B8B", gradient: "purple-pink", visibility: "public", cardIds: ["seed-16", "seed-17", "seed-18", "seed-19"] },
  { id: "other-4", name: "妄想2択", color: "#FF4B28", gradient: "orange-yellow", visibility: "public", cardIds: ["seed-16", "seed-19"] },
  { id: "other-5", name: "グルメな2択", color: "#DDEDA0", gradient: "green-yellow", visibility: "public", cardIds: ["seed-0", "seed-3", "seed-8", "seed-12"] },
  { id: "other-6", name: "恋愛迷子たちの駆け込み2択", color: "#CA76E8", gradient: "cyan-aqua", visibility: "public", cardIds: ["seed-11", "seed-15", "seed-19"] },
  { id: "other-7", name: "⚠️パパ閲覧注意！ママ限定2択", color: "#FC47F5", gradient: "pink-purple", visibility: "public", cardIds: ["seed-2", "seed-4", "seed-9", "seed-10", "seed-14"] },
];

/** 他ユーザーのコレクション一覧を取得 */
export function getOtherUsersCollections(): Collection[] {
  return OTHER_USERS_COLLECTIONS;
}

/**
 * popularCollections の id（"1"～"7"）やタイムライン用フォールバック（"d"）を
 * 実在する OTHER_USERS_COLLECTIONS の id にマッピング。
 * バナータップで「ページがない」を防ぐため。
 */
const POPULAR_ID_TO_OTHER_INDEX: Record<string, number> = {
  "1": 0,
  "2": 1,
  "3": 2,
  "4": 3,
  "5": 4,
  "6": 5,
  "7": 6,
  "d": 4, // フォールバック「マリオのワンダーなVOTE」→ グルメな2択
};

/** IDでコレクションを取得（自コレクション優先、人気idのマッピング、他ユーザー分） */
export function getCollectionById(id: string): Collection | null {
  const mine = load(getCurrentActivityUserId()).find((c) => c.id === id);
  if (mine) return mine;
  const otherIndex = POPULAR_ID_TO_OTHER_INDEX[id];
  if (otherIndex !== undefined && OTHER_USERS_COLLECTIONS[otherIndex]) {
    return OTHER_USERS_COLLECTIONS[otherIndex];
  }
  return OTHER_USERS_COLLECTIONS.find((c) => c.id === id) ?? null;
}

/** コレクションが他ユーザー作成か（人気id "1"～"7", "d" のマッピング分も含む） */
export function isOtherUsersCollection(collectionId: string): boolean {
  if (collectionId in POPULAR_ID_TO_OTHER_INDEX) return true;
  return OTHER_USERS_COLLECTIONS.some((c) => c.id === collectionId);
}

/** 現在のユーザーが作ったコレクション＋参加したメンバー限定（マイページで表示する用） */
export function getCollections(): Collection[] {
  return load(getCurrentActivityUserId());
}

/**
 * メンバー限定に投票したとき、マイページ用リストに追加（既に自分のコレクションにあれば何もしない）。
 * `createdByUserId` が現在ユーザーと一致する場合はオーナーなので追加しない。
 */
export function addParticipatedMemberCollectionIfNeeded(col: Collection, opts?: { skipRemote?: boolean }): void {
  if (col.visibility !== "member") return;
  const uid = getCurrentActivityUserId();
  if (col.createdByUserId && col.createdByUserId === uid) return;
  const cols = load(uid);
  if (cols.some((c) => c.id === col.id)) return;
  cols.push({
    id: col.id,
    name: col.name,
    color: col.color,
    gradient: col.gradient,
    visibility: "member",
    cardIds: Array.isArray(col.cardIds) ? [...col.cardIds] : [],
    joinedParticipation: true,
    createdByUserId: col.createdByUserId,
    createdByDisplayName: col.createdByDisplayName,
    createdByIconUrl: col.createdByIconUrl,
  });
  save(uid, cols);

  // ブラウザ/端末が変わっても維持できるよう、ログインユーザーはKVにも保存（KV未設定なら無視）
  if (opts?.skipRemote) return;
  const auth = getAuth();
  if (!auth.isLoggedIn || !auth.userId) return;
  fetch(`/api/member-collections`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userId: auth.userId,
      collection: {
        id: col.id,
        name: col.name,
        color: col.color,
        gradient: col.gradient,
        visibility: "member",
        cardIds: Array.isArray(col.cardIds) ? [...col.cardIds] : [],
        createdByUserId: col.createdByUserId,
        createdByDisplayName: col.createdByDisplayName,
        createdByIconUrl: col.createdByIconUrl,
      },
    }),
  }).catch(() => {});
}

/** KVに保存された「参加中メンバー限定コレクション」を取り込み（ログインユーザーのみ）。 */
export async function hydrateParticipatedMemberCollectionsFromRemote(): Promise<void> {
  if (typeof window === "undefined") return;
  const auth = getAuth();
  if (!auth.isLoggedIn || !auth.userId) return;
  try {
    const res = await fetch(`/api/member-collections?userId=${encodeURIComponent(auth.userId)}`);
    if (!res.ok) return;
    const data = (await res.json()) as { collections?: unknown };
    const list = Array.isArray(data?.collections) ? data.collections : [];
    const remoteIds = new Set<string>();
    for (const raw of list) {
      if (!raw || typeof raw !== "object") continue;
      const o = raw as Record<string, unknown>;
      const id = typeof o.id === "string" ? o.id : "";
      if (!id) continue;
      const visibility = o.visibility === "member" ? "member" : null;
      if (!visibility) continue;
      remoteIds.add(id);
      const col: Collection = {
        id,
        name: typeof o.name === "string" ? o.name : "",
        color: typeof o.color === "string" ? o.color : "#E5E7EB",
        gradient: typeof o.gradient === "string" ? (o.gradient as CollectionGradient) : undefined,
        visibility,
        cardIds: Array.isArray(o.cardIds) ? o.cardIds.filter((v): v is string => typeof v === "string") : [],
        joinedParticipation: true,
        createdByUserId: typeof o.createdByUserId === "string" ? o.createdByUserId : undefined,
        createdByDisplayName:
          typeof o.createdByDisplayName === "string" && o.createdByDisplayName.trim()
            ? o.createdByDisplayName.trim()
            : undefined,
        createdByIconUrl: typeof o.createdByIconUrl === "string" && o.createdByIconUrl.length > 0 ? o.createdByIconUrl : undefined,
      };
      addParticipatedMemberCollectionIfNeeded(col, { skipRemote: true });
    }

    // KV側から消えた参加中コレクションはローカルからも掃除（作成者削除の反映）
    const uid = getCurrentActivityUserId();
    const current = getCollections();
    const next = current.filter((c) => !c.joinedParticipation || remoteIds.has(c.id));
    if (next.length !== current.length) {
      save(uid, next);
    }
  } catch {
    // ignore
  }
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

/** 公開・メンバー限定コレクションをAPIに同期（リンクで誰でも見れるように） */
function syncCollectionToApi(col: Collection): void {
  if (col.joinedParticipation) return;
  if (col.visibility === "private") return;
  const userId = getCurrentActivityUserId();
  const auth = getAuth();
  const ownerName =
    col.createdByDisplayName?.trim() ||
    (auth.isLoggedIn && auth.user?.name?.trim() ? auth.user.name.trim() : undefined);
  const ownerIcon =
    col.createdByIconUrl ||
    (auth.isLoggedIn && auth.user?.iconUrl?.length ? auth.user.iconUrl : undefined);
  fetch("/api/collection", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userId,
      collection: {
        id: col.id,
        name: col.name,
        color: col.color,
        gradient: col.gradient,
        visibility: col.visibility,
        cardIds: col.cardIds,
        ...(ownerName ? { createdByDisplayName: ownerName } : {}),
        ...(ownerIcon ? { createdByIconUrl: ownerIcon } : {}),
      },
    }),
  }).catch(() => {});
}

/** コレクションをAPIから削除（非公開化・削除時） */
function deleteCollectionFromApi(id: string): void {
  fetch(`/api/collection/${encodeURIComponent(id)}`, { method: "DELETE" }).catch(() => {});
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
  if (!col.joinedParticipation && (col.visibility === "public" || col.visibility === "member")) syncCollectionToApi(col);
}

/** カードをコレクションから削除 */
export function removeCardFromCollection(collectionId: string, cardId: string): void {
  const userId = getCurrentActivityUserId();
  const cols = load(userId);
  const col = cols.find((c) => c.id === collectionId);
  if (!col) return;
  col.cardIds = col.cardIds.filter((id) => id !== cardId);
  save(userId, cols);
  if (!col.joinedParticipation && (col.visibility === "public" || col.visibility === "member")) syncCollectionToApi(col);
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
  if (!col.joinedParticipation && (col.visibility === "public" || col.visibility === "member")) syncCollectionToApi(col);
}

/** 新規コレクション作成（現在ユーザーが作る。名前必須） */
export function createCollection(
  name: string,
  options?: { color?: string; gradient?: CollectionGradient; visibility?: CollectionVisibility }
): Collection {
  const userId = getCurrentActivityUserId();
  const auth = getAuth();
  const cols = load(userId);
  const id = `col-${Date.now()}`;
  const newCol: Collection = {
    id,
    name: name.trim() || "新しいコレクション",
    color: options?.color ?? "#87CEEB",
    gradient: options?.gradient,
    visibility: options?.visibility ?? "public",
    cardIds: [],
    createdByUserId: userId,
    createdByDisplayName:
      auth.isLoggedIn && auth.user?.name?.trim() ? auth.user.name.trim() : undefined,
    createdByIconUrl:
      auth.isLoggedIn && auth.user?.iconUrl?.length ? auth.user.iconUrl : undefined,
  };
  cols.push(newCol);
  save(userId, cols);
  if (newCol.visibility === "public" || newCol.visibility === "member") syncCollectionToApi(newCol);
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
  if (col.joinedParticipation) {
    if (updates.name !== undefined) col.name = updates.name.trim() || col.name;
    if (updates.color !== undefined) col.color = updates.color;
    if (updates.gradient !== undefined) col.gradient = updates.gradient;
    save(userId, cols);
    return;
  }
  if (updates.name !== undefined) col.name = updates.name.trim() || col.name;
  if (updates.color !== undefined) col.color = updates.color;
  if (updates.gradient !== undefined) col.gradient = updates.gradient;
  if (updates.visibility !== undefined) col.visibility = updates.visibility;
  save(userId, cols);
  if (col.visibility === "public" || col.visibility === "member") syncCollectionToApi(col);
  else if (updates.visibility === "private") deleteCollectionFromApi(id);
}

/** コレクションを削除（参加中のメンバー限定はマイリストから外すだけで KV は触らない） */
export function deleteCollection(id: string): void {
  const userId = getCurrentActivityUserId();
  const prev = load(userId);
  const target = prev.find((c) => c.id === id);
  const cols = prev.filter((c) => c.id !== id);
  save(userId, cols);
  const pinned = getPinnedCollectionIds().filter((pid) => pid !== id);
  if (pinned.length < getPinnedCollectionIds().length) savePinnedIds(userId, pinned);
  if (target?.joinedParticipation) return;
  deleteCollectionFromApi(id);
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

/** ピン留めの最大数（これ以上は古い順に解除） */
export const MAX_PINNED_COLLECTIONS = 10;

/** ピン留めをトグル（検索画面にピン留め）。最大 MAX_PINNED_COLLECTIONS 件で、超えた場合は古い順に解除。 */
export function togglePinnedCollection(collectionId: string): void {
  const userId = getCurrentActivityUserId();
  const current = loadPinnedIds(userId);
  const has = current.includes(collectionId);
  let next: string[];
  if (has) {
    next = current.filter((id) => id !== collectionId);
  } else {
    if (current.length >= MAX_PINNED_COLLECTIONS) {
      next = [...current.slice(1), collectionId];
    } else {
      next = [...current, collectionId];
    }
  }
  savePinnedIds(userId, next);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(PINNED_UPDATED_EVENT));
  }
}
