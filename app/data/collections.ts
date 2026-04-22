/**
 * ブックマークコレクション（COLLECTION）
 * 関係図: ログイン後のユーザーが作ることができる。管理も作成ユーザーのみ。
 * 公開設定により、全員がみれたり・個人だけ・リンクを知っているメンバのみ見れる（public / private / member）。
 * ユーザーごとに localStorage で永続化しつつ、ログイン時は KV（/api/user-collections）に作成分を同期して端末をまたいで同じ一覧にする。
 * 非公開は共有用 vote_collection:{id} には載せず、ユーザー専用キーにのみ保存する。
 */

import type { CollectionGradient } from "./search";
import { getAuth, getCurrentActivityUserId } from "./auth";
import { addBookmark, removeBookmark } from "./bookmarks";
import { showAppToast } from "../lib/appToast";

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

function save(userId: string, collections: Collection[], opts?: { skipRemotePush?: boolean }): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY_PREFIX + userId, JSON.stringify(collections));
    window.dispatchEvent(new CustomEvent(EVENT_NAME));
  } catch {
    // ignore
  }
  if (!opts?.skipRemotePush) {
    void pushUserOwnedCollectionsToRemoteIfLoggedIn(userId, collections);
  }
}

/** 作成したコレのみ（参加中のメンバー限定は除外）を KV に同期 */
async function pushUserOwnedCollectionsToRemoteIfLoggedIn(userId: string, allCollections: Collection[]): Promise<void> {
  const auth = getAuth();
  if (!auth.isLoggedIn || !auth.userId || auth.userId !== userId) return;
  const owned = allCollections.filter((c) => !c.joinedParticipation);
  try {
    const res = await fetch("/api/user-collections", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: auth.userId, collections: owned }),
    });
    if (!res.ok) {
      let message = "コレクションのサーバー同期に失敗しました。";
      try {
        const data = (await res.json()) as { error?: string };
        if (typeof data?.error === "string" && data.error.length > 0) message = data.error;
      } catch {
        /* ignore */
      }
      showAppToast(message, "error");
    }
  } catch {
    showAppToast("コレクションのサーバー同期に失敗しました。", "error");
  }
}

/**
 * KV に保存された「自分が作成したコレクション」を取り込み（非公開含む・ログインユーザーのみ）。
 * 参加中メンバー限定は /api/member-collections 側のまま。
 */
export async function hydrateUserOwnedCollectionsFromRemote(): Promise<void> {
  if (typeof window === "undefined") return;
  const auth = getAuth();
  if (!auth.isLoggedIn || !auth.userId) return;
  const uid = auth.userId;
  try {
    const res = await fetch(`/api/user-collections?userId=${encodeURIComponent(uid)}`);
    if (res.status === 503) return;
    if (!res.ok) return;
    const data = (await res.json()) as { collections?: unknown };
    const list = Array.isArray(data?.collections) ? data.collections : [];
    const ownedServer: Collection[] = [];
    for (const raw of list) {
      if (!raw || typeof raw !== "object") continue;
      ownedServer.push(normalizeCollection(raw as Record<string, unknown>));
    }

    const local = load(uid);
    const joined = local.filter((c) => c.joinedParticipation);
    const ownedLocal = local.filter((c) => !c.joinedParticipation);

    if (ownedServer.length === 0 && ownedLocal.length > 0) {
      await pushUserOwnedCollectionsToRemoteIfLoggedIn(uid, local);
      return;
    }

    // PUT 完了前に GET が走るとサーバー側にまだ無い作成コレが消えるため、サーバー優先＋ローカルのみの id を残す
    const serverIds = new Set(ownedServer.map((c) => c.id));
    const mergedOwned = [...ownedServer];
    for (const c of ownedLocal) {
      if (serverIds.has(c.id)) continue;
      mergedOwned.push(c);
    }
    const merged = [...mergedOwned, ...joined];
    save(uid, merged, { skipRemotePush: true });
  } catch {
    // ignore
  }
}

/** 他ユーザー作成のコレクション（デモ用シードは未使用。API 連携などで差し込む場合に利用） */
export const OTHER_USERS_COLLECTIONS: Collection[] = [];

/** 他ユーザーのコレクション一覧を取得 */
export function getOtherUsersCollections(): Collection[] {
  return OTHER_USERS_COLLECTIONS;
}

/** IDでコレクションを取得（自コレクション優先、その後 OTHER_USERS_COLLECTIONS） */
export function getCollectionById(id: string): Collection | null {
  const mine = load(getCurrentActivityUserId()).find((c) => c.id === id);
  if (mine) return mine;
  return OTHER_USERS_COLLECTIONS.find((c) => c.id === id) ?? null;
}

/** コレクションが他ユーザー作成か（OTHER_USERS_COLLECTIONS に含まれる id） */
export function isOtherUsersCollection(collectionId: string): boolean {
  return OTHER_USERS_COLLECTIONS.some((c) => c.id === collectionId);
}

/** 現在のユーザーが作ったコレクション＋参加したメンバー限定（マイページで表示する用） */
export function getCollections(): Collection[] {
  return load(getCurrentActivityUserId());
}

/**
 * メンバー限定を開いた／投票したとき、マイページ用リストに追加（未登録時のみローカルに push）。
 * ログイン時は参加インデックス・表示用プロフィールの同期のため、既に参加済みでも KV へ POST する。
 * `createdByUserId` が現在ユーザーと一致する場合はオーナーなので何もしない。
 */
export function addParticipatedMemberCollectionIfNeeded(col: Collection, opts?: { skipRemote?: boolean }): void {
  if (col.visibility !== "member") return;
  const uid = getCurrentActivityUserId();
  if (col.createdByUserId && col.createdByUserId === uid) return;
  const cols = load(uid);
  if (!cols.some((c) => c.id === col.id)) {
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
  }

  // ブラウザ/端末が変わっても維持できるよう、ログインユーザーはKVにも保存（KV未設定なら無視）
  if (opts?.skipRemote) return;
  const auth = getAuth();
  if (!auth.isLoggedIn || !auth.userId) return;
  const memberProfile =
    typeof auth.user?.name === "string" && auth.user.name.trim()
      ? {
          name: auth.user.name.trim(),
          ...(typeof auth.user.iconUrl === "string" && auth.user.iconUrl.length > 0
            ? { iconUrl: auth.user.iconUrl }
            : {}),
        }
      : undefined;

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
      ...(memberProfile ? { memberProfile } : {}),
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
  void (async () => {
    try {
      const res = await fetch("/api/collection", {
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
      });
      if (!res.ok) {
        let message = "コレクションの公開設定をサーバーに保存できませんでした。";
        try {
          const data = (await res.json()) as { error?: string };
          if (typeof data?.error === "string" && data.error.length > 0) message = data.error;
        } catch {
          /* ignore */
        }
        showAppToast(message, "error");
      }
    } catch {
      showAppToast("コレクションの公開設定をサーバーに保存できませんでした。", "error");
    }
  })();
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

/** コレクションを削除（参加中のメンバー限定はローカル＋参加中KVから外す。オーナーの本体KVは触らない） */
export function deleteCollection(id: string): void {
  const userId = getCurrentActivityUserId();
  const prev = load(userId);
  const target = prev.find((c) => c.id === id);
  const cols = prev.filter((c) => c.id !== id);
  save(userId, cols);
  const pinned = getPinnedCollectionIds().filter((pid) => pid !== id);
  if (pinned.length < getPinnedCollectionIds().length) savePinnedIds(userId, pinned);
  /** 削除コレクションにだけ入っていた VOTE は、他コレクションに無ければ Bookmark からも外す */
  if (target?.cardIds?.length) {
    for (const cardId of target.cardIds) {
      const stillInSomeCollection = cols.some((c) => c.cardIds.includes(cardId));
      if (!stillInSomeCollection) removeBookmark(cardId);
    }
  }
  if (target?.joinedParticipation) {
    const auth = getAuth();
    if (auth.isLoggedIn && auth.userId) {
      fetch("/api/member-collections", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: auth.userId, collectionId: id }),
      }).catch(() => {});
    }
    return;
  }
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
