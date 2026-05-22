/**
 * ブックマークコレクション（COLLECTION）
 * 関係図: ログイン後のユーザーが作ることができる。管理も作成ユーザーのみ。
 * 公開設定により、全員がみれたり・個人だけ・リンクを知っているメンバのみ見れる（public / private / member）。
 * ユーザーごとに localStorage で永続化しつつ、ログイン時は KV（/api/user-collections）に作成分を同期して端末をまたいで同じ一覧にする。
 * 非公開は共有用 vote_collection:{id} には載せず、ユーザー専用キーにのみ保存する。
 */

import type { CollectionGradient } from "./search";
import { getAuth, getCurrentActivityUserId } from "./auth";
import {
  clearCollectionScopedLocalData,
  notifyMemberCollectionLeft,
  upsertLocalJoinProfileFromAuth,
} from "./collectionVoteActivity";
import { removeLocalCommentsForCollection } from "./voteCardActivity";
import { addBookmark, removeBookmark } from "./bookmarks";
import { showAppToast } from "../lib/appToast";
import { getSeedClassicCardIds } from "./voteCards";
import { DEFAULT_RYO_AVATAR_URL } from "./avatarUrls";

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

/** hydrate と create の競合で一覧が消えるのを防ぐ（SharedDataContext 側の直列化と併用） */
let collectionsWriteChain: Promise<void> = Promise.resolve();

function withCollectionsWriteLock<T>(work: () => T | Promise<T>): Promise<T> {
  const run = collectionsWriteChain.then(() => work());
  collectionsWriteChain = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

function saveUnlocked(userId: string, collections: Collection[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY_PREFIX + userId, JSON.stringify(collections));
    window.dispatchEvent(new CustomEvent(EVENT_NAME));
  } catch {
    // ignore
  }
}

function save(userId: string, collections: Collection[], opts?: { skipRemotePush?: boolean }): void {
  saveUnlocked(userId, collections);
  if (opts?.skipRemotePush) return;
  void withCollectionsWriteLock(() => pushUserOwnedCollectionsToRemoteIfLoggedIn(userId, collections));
}

/** 作成したコレのみ（参加中のメンバー限定は除外）を KV に同期 */
async function pushUserOwnedCollectionsToRemoteIfLoggedIn(userId: string, allCollections: Collection[]): Promise<void> {
  const auth = getAuth();
  if (!auth.isLoggedIn) return;
  const remoteUserId = auth.userId ?? getCurrentActivityUserId();
  if (!remoteUserId || remoteUserId !== userId) return;
  const owned = allCollections.filter((c) => !c.joinedParticipation);
  try {
    const res = await fetch("/api/user-collections", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: remoteUserId, collections: owned }),
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
  if (!auth.isLoggedIn) return;
  const uid = getCurrentActivityUserId();
  if (!uid || uid.startsWith("guest_")) return;
  try {
    await withCollectionsWriteLock(async () => {
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
      saveUnlocked(uid, merged);
    });
  } catch {
    // ignore
  }
}

/** 直近の PUT /api/user-collections が終わるまで待つ（作成直後の hydrate 競合防止） */
export function waitForCollectionsRemoteQueue(): Promise<void> {
  return collectionsWriteChain;
}

/** 定番の2択（デモ用の固定コレクション。作成者: ryo） */
export const SEED_CLASSIC_COLLECTION_ID = "col-seed-classic";

/** 他ユーザー作成のコレクション（デモ用の固定分をここで差し込む） */
export const OTHER_USERS_COLLECTIONS: Collection[] = [
  {
    id: SEED_CLASSIC_COLLECTION_ID,
    name: "定番の2択",
    color: "#C4B5FD",
    gradient: "purple-pink",
    visibility: "public",
    cardIds: getSeedClassicCardIds(),
    createdByUserId: "user5",
    createdByDisplayName: "ryo",
    createdByIconUrl: DEFAULT_RYO_AVATAR_URL,
  },
];

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

/** メンバー限定コレクション（コレ内 VOTE ではコメント機能を使わない） */
export function isMemberOnlyCollection(collectionId: string | null | undefined): boolean {
  if (!collectionId) return false;
  const col = getCollectionById(collectionId);
  return col?.visibility === "member";
}

/** 現在のユーザーが作ったコレクション＋参加したメンバー限定（マイページで表示する用） */
export function getCollections(): Collection[] {
  return load(getCurrentActivityUserId());
}

function cardIdsEqual(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((id, i) => id === b[i]);
}

function joinedParticipationRowEqual(a: Collection, b: Collection): boolean {
  return (
    a.id === b.id &&
    a.name === b.name &&
    a.color === b.color &&
    a.gradient === b.gradient &&
    a.visibility === "member" &&
    Boolean(a.joinedParticipation) &&
    cardIdsEqual(a.cardIds, b.cardIds) &&
    (a.createdByUserId ?? "") === (b.createdByUserId ?? "") &&
    (a.createdByDisplayName ?? "") === (b.createdByDisplayName ?? "") &&
    (a.createdByIconUrl ?? "") === (b.createdByIconUrl ?? "")
  );
}

/**
 * 参加中メンバー限定のローカルコピーに、本体 KV の cardIds を反映する（マイページ・Bookmark 用）。
 */
export function syncJoinedMemberCollectionCardIdsFromCanonical(
  collectionId: string,
  canonicalCardIds: string[]
): void {
  const uid = getCurrentActivityUserId();
  const cols = load(uid);
  const idx = cols.findIndex((c) => c.id === collectionId && c.joinedParticipation);
  if (idx < 0) return;
  const row = cols[idx]!;
  if (cardIdsEqual(row.cardIds, canonicalCardIds)) return;
  cols[idx] = { ...row, cardIds: [...canonicalCardIds] };
  save(uid, cols, { skipRemotePush: true });
}

/**
 * メンバー限定コレクション画面用：ローカル参加コピーと API（vote_collection 本体）を合成。
 * cardIds は本体 KV を正とする（参加者ごとの古いスナップショットを表示しない）。
 */
export function mergeMemberCollectionForDisplay(
  local: Collection | null,
  canonical: Collection | null
): Collection | null {
  if (!local && !canonical) return null;
  if (!local) return canonical;
  if (!canonical) return local;
  const useCanonicalCards =
    local.visibility === "member" ||
    canonical.visibility === "member" ||
    Boolean(local.joinedParticipation);
  return {
    ...local,
    name: canonical.name || local.name,
    color: canonical.color || local.color,
    gradient: canonical.gradient ?? local.gradient,
    visibility: canonical.visibility ?? local.visibility,
    cardIds: useCanonicalCards ? [...canonical.cardIds] : [...local.cardIds],
    createdByUserId: canonical.createdByUserId ?? local.createdByUserId,
    createdByDisplayName: canonical.createdByDisplayName ?? local.createdByDisplayName,
    createdByIconUrl: canonical.createdByIconUrl ?? local.createdByIconUrl,
    joinedParticipation: local.joinedParticipation,
  };
}

/**
 * メンバー限定で初めて投票したとき、マイページ用リストに追加（未登録時のみローカルに push）。
 * ログイン時は参加中 KV へ同期。コレを開いただけでは呼ばない。
 * `createdByUserId` が現在ユーザーと一致する場合はオーナーなので何もしない。
 */
export function addParticipatedMemberCollectionIfNeeded(col: Collection, opts?: { skipRemote?: boolean }): void {
  if (col.visibility !== "member") return;
  const uid = getCurrentActivityUserId();
  if (col.createdByUserId && col.createdByUserId === uid) return;
  const cols = load(uid);
  const cardIds = Array.isArray(col.cardIds) ? [...col.cardIds] : [];
  const existingIdx = cols.findIndex((c) => c.id === col.id);
  const nextRow: Collection =
    existingIdx >= 0
      ? {
          ...cols[existingIdx]!,
          name: col.name,
          color: col.color,
          gradient: col.gradient,
          visibility: "member",
          cardIds,
          joinedParticipation: true,
          createdByUserId: col.createdByUserId ?? cols[existingIdx]!.createdByUserId,
          createdByDisplayName: col.createdByDisplayName ?? cols[existingIdx]!.createdByDisplayName,
          createdByIconUrl: col.createdByIconUrl ?? cols[existingIdx]!.createdByIconUrl,
        }
      : {
          id: col.id,
          name: col.name,
          color: col.color,
          gradient: col.gradient,
          visibility: "member",
          cardIds,
          joinedParticipation: true,
          createdByUserId: col.createdByUserId,
          createdByDisplayName: col.createdByDisplayName,
          createdByIconUrl: col.createdByIconUrl,
        };

  const localChanged =
    existingIdx < 0 || !joinedParticipationRowEqual(cols[existingIdx]!, nextRow);
  if (localChanged) {
    if (existingIdx >= 0) cols[existingIdx] = nextRow;
    else cols.push(nextRow);
    save(uid, cols);
  }

  // ブラウザ/端末が変わっても維持できるよう、ログインユーザーはKVにも保存（KV未設定なら無視）
  if (opts?.skipRemote) return;
  const auth = getAuth();
  if (!auth.isLoggedIn) return;
  const remoteUserId = auth.userId ?? uid;
  if (!remoteUserId || remoteUserId.startsWith("guest_")) return;
  const memberProfile =
    typeof auth.user?.name === "string" && auth.user.name.trim()
      ? {
          name: auth.user.name.trim(),
          ...(typeof auth.user.iconUrl === "string" && auth.user.iconUrl.length > 0
            ? { iconUrl: auth.user.iconUrl }
            : {}),
        }
      : undefined;

  if (memberProfile) upsertLocalJoinProfileFromAuth(col.id);

  // ローカルが既に最新なら KV POST は省略（参加登録ループ・タブ復帰時の連打を防ぐ）
  if (!localChanged && existingIdx >= 0) return;

  fetch(`/api/member-collections`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userId: remoteUserId,
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
  if (!auth.isLoggedIn) return;
  const uid = getCurrentActivityUserId();
  if (!uid || uid.startsWith("guest_")) return;
  try {
    const res = await fetch(`/api/member-collections?userId=${encodeURIComponent(uid)}`);
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

    /**
     * リモートに無い参加中コレクションをローカルから消すのは「作成者が削除した」ケースだけに限定する。
     * KV容量上限などで参加中の保存ができていないと、単純な差分掃除で参加中が消えてしまうため。
     */
    const current = getCollections();
    const candidates = current.filter((c) => c.joinedParticipation && !remoteIds.has(c.id));
    if (candidates.length > 0) {
      // まず一覧API（index）で存在確認し、無いものだけ個別に 404 確認（不要なリクエスト削減）
      let indexIds: Set<string> | null = null;
      try {
        const idxRes = await fetch("/api/collections");
        if (idxRes.ok) {
          const idx = (await idxRes.json()) as { collections?: unknown };
          const rows = Array.isArray(idx?.collections) ? idx.collections : [];
          const ids = new Set<string>();
          for (const r of rows) {
            if (!r || typeof r !== "object") continue;
            const id = (r as { id?: unknown }).id;
            if (typeof id === "string" && id.length > 0) ids.add(id);
          }
          indexIds = ids;
        }
      } catch {
        // ignore
      }
      const toRemove = new Set<string>();
      for (const c of candidates) {
        if (indexIds && indexIds.has(c.id)) continue;
        try {
          const r = await fetch(`/api/collection/${encodeURIComponent(c.id)}?userId=${encodeURIComponent(uid)}`);
          if (r.status === 404) toRemove.add(c.id);
        } catch {
          // ignore（ネットワーク失敗時は消さない）
        }
      }
      if (toRemove.size > 0) {
        const next = current.filter((c) => !(c.joinedParticipation && toRemove.has(c.id)));
        if (next.length !== current.length) {
          save(uid, next);
        }
        for (const rid of toRemove) {
          clearCollectionScopedLocalData(rid);
          removeLocalCommentsForCollection(rid);
        }
      }
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

function buildCollectionSyncPayload(col: Collection, userId: string) {
  const auth = getAuth();
  const ownerName =
    col.createdByDisplayName?.trim() ||
    (auth.isLoggedIn && auth.user?.name?.trim() ? auth.user.name.trim() : undefined);
  const ownerIcon =
    col.createdByIconUrl ||
    (auth.isLoggedIn && auth.user?.iconUrl?.length ? auth.user.iconUrl : undefined);
  return {
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
  };
}

/**
 * 公開・メンバー限定コレクションを KV に同期し、共有リンク用 GET まで確認する。
 * メンバー限定のシェア前に await すること。
 */
export async function syncCollectionToApiAndWait(
  col: Collection,
  opts?: { quiet?: boolean }
): Promise<boolean> {
  const quiet = opts?.quiet === true;
  if (col.joinedParticipation || col.visibility === "private") return true;
  const userId = getCurrentActivityUserId();
  try {
    const res = await fetch("/api/collection", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildCollectionSyncPayload(col, userId)),
    });
    if (!res.ok) {
      if (res.status === 507) {
        if (!quiet) {
          showAppToast("サーバーの保存容量の上限に達したため、共有リンクを発行できません。", "error");
        }
        return false;
      }
      if (!quiet) {
        let message = "コレクションの公開設定をサーバーに保存できませんでした。";
        try {
          const data = (await res.json()) as { error?: string };
          if (typeof data?.error === "string" && data.error.length > 0) message = data.error;
        } catch {
          /* ignore */
        }
        showAppToast(message, "error");
      }
      return false;
    }
    let verifyOk = false;
    for (let attempt = 0; attempt < 4; attempt++) {
      const verify = await fetch(
        `/api/collection/${encodeURIComponent(col.id)}?userId=${encodeURIComponent(userId)}`,
        { cache: "no-store" }
      );
      if (verify.status === 503) {
        if (!quiet) showAppToast("共有リンクにはサーバー（KV）の設定が必要です。", "error");
        return false;
      }
      if (verify.ok) {
        verifyOk = true;
        break;
      }
      if (verify.status !== 404 || attempt === 3) break;
      await new Promise((r) => setTimeout(r, 40 * (attempt + 1)));
    }
    if (!verifyOk) {
      if (!quiet) showAppToast("共有用のコレクション登録を確認できませんでした。", "error");
      return false;
    }
    return true;
  } catch {
    if (!quiet) showAppToast("コレクションの公開設定をサーバーに保存できませんでした。", "error");
    return false;
  }
}

/** 公開・メンバー限定コレクションをAPIに同期（リンクで誰でも見れるように） */
function syncCollectionToApi(col: Collection): void {
  if (col.joinedParticipation) return;
  if (col.visibility === "private") return;
  void syncCollectionToApiAndWait(col);
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

type CollectionMutationOpts = { skipApiSync?: boolean; skipRemotePush?: boolean };

/** カードをコレクションに追加（Bookmarkにも登録する） */
export function addCardToCollection(
  collectionId: string,
  cardId: string,
  opts?: CollectionMutationOpts
): void {
  const userId = getCurrentActivityUserId();
  const cols = load(userId);
  const col = cols.find((c) => c.id === collectionId);
  if (!col || col.cardIds.includes(cardId)) return;
  col.cardIds.push(cardId);
  save(userId, cols, opts?.skipRemotePush ? { skipRemotePush: true } : undefined);
  addBookmark(cardId);
  if (
    !opts?.skipApiSync &&
    !col.joinedParticipation &&
    (col.visibility === "public" || col.visibility === "member")
  ) {
    syncCollectionToApi(col);
  }
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
  options?: {
    color?: string;
    gradient?: CollectionGradient;
    visibility?: CollectionVisibility;
    skipApiSync?: boolean;
    skipRemotePush?: boolean;
  }
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
  save(userId, cols, options?.skipRemotePush ? { skipRemotePush: true } : undefined);
  if (
    !options?.skipApiSync &&
    (newCol.visibility === "public" || newCol.visibility === "member")
  ) {
    syncCollectionToApi(newCol);
  }
  return newCol;
}

/** 公開・メンバー限定コレを KV に1回だけ同期（作成直後＋カード追加のまとめ用） */
export function syncOwnedCollectionToApiIfPublic(collectionId: string): void {
  const col = load(getCurrentActivityUserId()).find((c) => c.id === collectionId);
  if (!col || col.joinedParticipation) return;
  if (col.visibility === "public" || col.visibility === "member") syncCollectionToApi(col);
}

/**
 * 設定モーダルから新規コレ作成（ローカル保存 → PUT 完了待ち → 公開系は KV 同期を1回）。
 * Bookmark の「新しいコレクション」・マイページ追加で共通利用。
 */
export async function createOwnedCollectionFromSettings(
  name: string,
  options: {
    gradient?: CollectionGradient;
    visibility?: CollectionVisibility;
    cardId?: string;
  }
): Promise<Collection> {
  const created = createCollection(name, {
    gradient: options.gradient,
    visibility: options.visibility,
    skipApiSync: true,
    skipRemotePush: true,
  });
  if (options.cardId) addCardToCollection(created.id, options.cardId, { skipApiSync: true });
  await waitForCollectionsRemoteQueue();
  syncOwnedCollectionToApiIfPublic(created.id);
  const saved = load(getCurrentActivityUserId()).find((c) => c.id === created.id) ?? created;
  showAppToast("コレクションを作成しました");
  return saved;
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
    // 参加解除: この端末のコレ内投票/参加者/コメントも消す（表示・集計を残さない）
    clearCollectionScopedLocalData(id);
    removeLocalCommentsForCollection(id);
    const auth = getAuth();
    const remoteUserId = auth.isLoggedIn && auth.userId ? auth.userId : userId;
    void (async () => {
      if (auth.isLoggedIn && auth.userId) {
        try {
          await fetch("/api/member-collections", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: auth.userId, collectionId: id }),
          });
        } catch {
          // ignore
        }
      }
      notifyMemberCollectionLeft(id, remoteUserId);
    })();
    return;
  }
  // 作成者削除: ローカルのコレ内キャッシュも掃除
  clearCollectionScopedLocalData(id);
  removeLocalCommentsForCollection(id);
  deleteCollectionFromApi(id);
}

const SEED_PAPA_WARNING_COLLECTION_ID = "col-seed-papa-warning";

/** 旧デモ用シード「⚠️パパ閲覧注意」を一覧から除去（既に登録済みの端末向け） */
export function removeSeedPapaWarningCollection(): void {
  if (typeof window === "undefined") return;
  const uid = getCurrentActivityUserId();
  const cols = load(uid);
  if (!cols.some((c) => c.id === SEED_PAPA_WARNING_COLLECTION_ID)) return;
  deleteCollection(SEED_PAPA_WARNING_COLLECTION_ID);
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
