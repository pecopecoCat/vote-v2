/**
 * VOTEカードの「活動データ」：投票数・コメントは全ユーザー共通の総数で保存。
 * 誰がどの選択肢を選んだか（投票済み表示）だけユーザー別に保存。
 *
 * - 総投票数・コメント一覧 → vote_card_activity_global（ユーザーに依存しない）
 * - 現在ユーザーの投票選択 → vote_card_activity_${userId}（ログイン/ゲスト別）
 */

import { normalizeCardIdKey } from "../lib/normalize";
import { DEMO_USER_IDS, getAuth, getCurrentActivityUserId, type DemoUserId } from "./auth";

/** コメント1件：コメントしたユーザー・日付・テキスト・いいね数・返信先 */
export interface VoteComment {
  id: string;
  /** コメントしたユーザーID（後から参加解除/削除で掃除する用途。旧データには無い） */
  userId?: string;
  /** コメントしたユーザー */
  user: { name: string; iconUrl?: string };
  /** メンバー限定コレクション内コメントの場合のみ collectionId を持つ（通常コメントは undefined） */
  collectionId?: string;
  /** コメントされた日付（ISO文字列） */
  date: string;
  /** コメントテキスト */
  text: string;
  /** いいね数（お知らせ「送ったコメントにいいね」用） */
  likeCount?: number;
  /** 返信先コメントID（省略時はトップレベルコメント） */
  parentId?: string;
  /** このコメントへの返信数 */
  replyCount?: number;
  /** コメントしたユーザーがそのカードで選んだA or B（お知らせのアイコン用） */
  userVoteOption?: "A" | "B";
}

/** カードごとの活動：投票数（総数）・コメント一覧 ＋ 現在ユーザーの選択（表示用） */
export interface CardActivity {
  /** Aに投票した人数（総数・端末での加算分を含む） */
  countA: number;
  /** Bに投票した人数（総数） */
  countB: number;
  /** コメント一覧（総数） */
  comments: VoteComment[];
  /** 現在のユーザーが選んだ選択肢（投票済み表示用・ユーザー別ストレージから） */
  userSelectedOption?: "A" | "B";
  /** 現在ユーザーがそのカードに投票した日時（myTimeline 並び替え用・省略時は未記録） */
  userVotedAt?: string;
}

/** グローバル保存用：投票数・コメントのみ（ユーザーに依存しない） */
interface GlobalCardData {
  countA: number;
  countB: number;
  comments: VoteComment[];
}

const GLOBAL_STORAGE_KEY = "vote_card_activity_global";
const USER_STORAGE_KEY_PREFIX = "vote_card_activity_";
const VOTE_EVENTS_KEY = "vote_vote_events";
const COMMENT_LIKES_BY_ME_KEY_PREFIX = "vote_comment_likes_by_me_";
const MAX_VOTE_EVENTS = 100;
export const ACTIVITY_GLOBAL_UPDATED_EVENT = "vote_activity_global_updated";
export const COMMENT_LIKES_BY_ME_UPDATED_EVENT = "vote_comment_likes_by_me_updated";

function getUserStorageKey(): string {
  return USER_STORAGE_KEY_PREFIX + getCurrentActivityUserId();
}

function loadGlobal(): Record<string, GlobalCardData> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(GLOBAL_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, GlobalCardData>;
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

function saveGlobal(data: Record<string, GlobalCardData>): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(GLOBAL_STORAGE_KEY, JSON.stringify(data));
    window.dispatchEvent(new Event(ACTIVITY_GLOBAL_UPDATED_EVENT));
  } catch {
    // ignore
  }
}

/** メンバー限定コレクション内コメントをローカルから削除（参加解除・コレ削除時） */
export function removeLocalCommentsForCollection(collectionId: string, opts?: { onlyUserId?: string }): void {
  if (!collectionId) return;
  const onlyUserId = opts?.onlyUserId;
  const global = loadGlobal();
  let changed = false;
  const next: Record<string, GlobalCardData> = { ...global };
  for (const [cardId, row] of Object.entries(global)) {
    const comments = Array.isArray(row?.comments) ? row.comments : [];
    const filtered = comments.filter((c) => {
      if ((c as { collectionId?: unknown }).collectionId !== collectionId) return true;
      if (onlyUserId) {
        const cid = (c as { userId?: unknown }).userId;
        return typeof cid === "string" && cid.length > 0 ? cid !== onlyUserId : false;
      }
      return false;
    });
    if (filtered.length !== comments.length) {
      changed = true;
      next[cardId] = { ...row, comments: filtered };
    }
  }
  if (changed) saveGlobal(next);
}

export type UserVoteSelectionRow = { userSelectedOption?: "A" | "B"; votedAt?: string };

function parseUserSelectionsJson(raw: string | null): Record<string, UserVoteSelectionRow> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (typeof parsed !== "object" || parsed === null) return {};
    const out: Record<string, UserVoteSelectionRow> = {};
    for (const [cardId, v] of Object.entries(parsed)) {
      const nid = normalizeCardIdKey(cardId);
      if (typeof v === "string" && (v === "A" || v === "B")) {
        out[nid] = { userSelectedOption: v };
        continue;
      }
      if (v && typeof v === "object") {
        const o = v as Record<string, unknown>;
        const opt = o.userSelectedOption === "A" || o.userSelectedOption === "B" ? o.userSelectedOption : undefined;
        const votedAt = typeof o.votedAt === "string" ? o.votedAt : undefined;
        if (opt || votedAt) out[nid] = { userSelectedOption: opt, votedAt };
      }
    }
    return out;
  } catch {
    return {};
  }
}

function loadUserSelectionsForActivityUserId(activityUserId: string): Record<string, UserVoteSelectionRow> {
  if (typeof window === "undefined") return {};
  try {
    return parseUserSelectionsJson(window.localStorage.getItem(USER_STORAGE_KEY_PREFIX + activityUserId));
  } catch {
    return {};
  }
}

function loadUserSelections(): Record<string, UserVoteSelectionRow> {
  return loadUserSelectionsForActivityUserId(getCurrentActivityUserId());
}

/**
 * 未ログイン（guest_*）で入れた投票選択をログイン後のユーザーに引き継ぐ（localStorage）。
 * グローバル票数は既に加算済みのため、ユーザー別の選択のみコピーする。
 */
export function migrateGuestVoteSelectionsToUser(
  targetActivityUserId: string,
  guestActivityUserId: string
): void {
  if (typeof window === "undefined") return;
  if (!guestActivityUserId.startsWith("guest_")) return;
  if (targetActivityUserId.startsWith("guest_")) return;

  const guest = loadUserSelectionsForActivityUserId(guestActivityUserId);
  if (Object.keys(guest).length === 0) return;

  const target = loadUserSelectionsForActivityUserId(targetActivityUserId);
  const next = { ...target };
  for (const [cardId, row] of Object.entries(guest)) {
    const opt = row.userSelectedOption;
    if (opt !== "A" && opt !== "B") continue;
    const nid = normalizeCardIdKey(cardId);
    const existing = next[nid];
    const gt = row.votedAt ?? "";
    const et = existing?.votedAt ?? "";
    if (!existing?.userSelectedOption || gt >= et) {
      next[nid] = { userSelectedOption: opt, votedAt: gt || new Date().toISOString() };
    }
  }
  try {
    window.localStorage.setItem(USER_STORAGE_KEY_PREFIX + targetActivityUserId, JSON.stringify(next));
  } catch {
    // ignore
  }
}

/** KV 上の guest 用 userSelections をログインユーザーへ移す（票数は増やさない） */
export async function claimGuestVoteSelectionsOnServer(
  guestActivityUserId: string,
  targetActivityUserId: string
): Promise<void> {
  if (typeof window === "undefined") return;
  if (!guestActivityUserId.startsWith("guest_")) return;
  if (targetActivityUserId.startsWith("guest_")) return;
  try {
    await fetch("/api/activity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "claim_guest_selections",
        guestUserId: guestActivityUserId,
        targetUserId: targetActivityUserId,
      }),
    });
  } catch {
    // ignore
  }
}

function saveUserSelections(data: Record<string, UserVoteSelectionRow>): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(getUserStorageKey(), JSON.stringify(data));
  } catch {
    // ignore
  }
}

function normalizeCardActivity(g: GlobalCardData | undefined, u: UserVoteSelectionRow | undefined): CardActivity {
  return {
    countA: g && typeof g.countA === "number" && g.countA >= 0 ? g.countA : 0,
    countB: g && typeof g.countB === "number" && g.countB >= 0 ? g.countB : 0,
    comments: g && Array.isArray(g.comments) ? g.comments : [],
    userSelectedOption: u?.userSelectedOption === "A" || u?.userSelectedOption === "B" ? u.userSelectedOption : undefined,
    userVotedAt: typeof u?.votedAt === "string" && u.votedAt ? u.votedAt : undefined,
  };
}

/** カードIDに対応する活動データを取得（総数＋現在ユーザーの選択をマージ） */
export function getActivity(cardId: string): CardActivity {
  const global = loadGlobal();
  const user = loadUserSelections();
  return normalizeCardActivity(global[cardId], user[cardId]);
}

/** 全カードの活動を取得（HOMEなどで一括マージする用）。総数＋現在ユーザーの選択をマージ。 */
export function getAllActivity(): Record<string, CardActivity> {
  const global = loadGlobal();
  const user = loadUserSelections();
  const rawKeys = new Set([...Object.keys(global), ...Object.keys(user)]);
  const raw: Record<string, CardActivity> = {};
  for (const id of rawKeys) {
    raw[id] = normalizeCardActivity(global[id], user[id]);
  }
  const normalizedIds = new Set(
    [...Object.keys(raw)].map((id) => normalizeCardIdKey(id))
  );
  const result: Record<string, CardActivity> = {};
  for (const nk of normalizedIds) {
    result[nk] = resolveActivityForCard(raw, nk);
  }
  return result;
}

/** 投票イベント（お知らせ「作成した2択に投票がありました」用） */
export interface VoteEvent {
  cardId: string;
  date: string;
  /** 投票した選択肢（お知らせでA/Bバッジ表示用） */
  option?: "A" | "B";
}

function loadVoteEvents(): VoteEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(VOTE_EVENTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as VoteEvent[]) : [];
  } catch {
    return [];
  }
}

function saveVoteEvents(events: VoteEvent[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(VOTE_EVENTS_KEY, JSON.stringify(events.slice(-MAX_VOTE_EVENTS)));
  } catch {
    // ignore
  }
}

/** 投票イベント一覧を取得（作成者向けお知らせ用・日付降順） */
export function getVoteEvents(): VoteEvent[] {
  const events = loadVoteEvents();
  return [...events].sort((a, b) => (b.date || "").localeCompare(a.date || ""));
}

/** 2択に投票する：総数に +1、現在ユーザーの選択を記録し、投票イベントを追加 */
export function addVote(cardId: string, option: "A" | "B"): void {
  const global = loadGlobal();
  const current = global[cardId] ?? { countA: 0, countB: 0, comments: [] };
  const nextGlobal: GlobalCardData = {
    countA: current.countA + (option === "A" ? 1 : 0),
    countB: current.countB + (option === "B" ? 1 : 0),
    comments: Array.isArray(current.comments) ? current.comments : [],
  };
  saveGlobal({ ...global, [cardId]: nextGlobal });

  const user = loadUserSelections();
  const votedAt = new Date().toISOString();
  saveUserSelections({ ...user, [cardId]: { userSelectedOption: option, votedAt } });

  const events = loadVoteEvents();
  events.push({ cardId, date: new Date().toISOString(), option });
  saveVoteEvents(events);
}

/** コメントを追加：総数側に登録（全ユーザー共通）。parentId 指定時は返信として追加し親の replyCount を+1。commenterVoteOption はお知らせのA/Bバッジ用 */
export function addComment(
  cardId: string,
  comment: { user: { name: string; iconUrl?: string }; text: string },
  parentCommentId?: string,
  commenterVoteOption?: "A" | "B",
  collectionId?: string
): void {
  const global = loadGlobal();
  const current = global[cardId] ?? { countA: 0, countB: 0, comments: [] };
  const comments = Array.isArray(current.comments) ? current.comments : [];
  const authorUserId = getCurrentActivityUserId();
  const newComment: VoteComment = {
    id: `comment-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    ...(DEMO_USER_IDS.includes(authorUserId as DemoUserId) ? { userId: authorUserId } : {}),
    user: comment.user,
    ...(typeof collectionId === "string" && collectionId.length > 0 ? { collectionId } : {}),
    date: new Date().toISOString(),
    text: comment.text,
    likeCount: 0,
    parentId: parentCommentId,
    replyCount: 0,
    userVoteOption: commenterVoteOption,
  };
  let nextComments = [...comments, newComment];
  if (parentCommentId) {
    nextComments = nextComments.map((c) =>
      c.id === parentCommentId
        ? { ...c, replyCount: (c.replyCount ?? 0) + 1 }
        : c
    );
  }
  const next: GlobalCardData = {
    countA: current.countA ?? 0,
    countB: current.countB ?? 0,
    comments: nextComments,
  };
  saveGlobal({ ...global, [cardId]: next });
}

/**
 * 自分のコメント／リプライのみ削除。親を消すとその下のリプライもまとめて削除し、リプライのみ消すと親の replyCount を減らす。
 * currentCard を渡すとその comments を基準に更新する（メモリ上の activity とストレージのズレ防止）。
 */
export function removeComment(
  cardId: string,
  commentId: string,
  currentCard?: { countA: number; countB: number; comments: VoteComment[] }
): boolean {
  const auth = getAuth();
  const opts = { isLoggedIn: auth.isLoggedIn, displayName: auth.user?.name ?? null };
  const global = loadGlobal();
  const fromStorage = global[cardId] ?? { countA: 0, countB: 0, comments: [] };
  const current = currentCard ?? fromStorage;
  const comments = Array.isArray(current.comments) ? current.comments : [];
  const target = comments.find((c) => c.id === commentId);
  if (!target || !isCommentAuthoredByCurrentUser(target.user?.name, opts)) {
    return false;
  }

  const idsToRemove = new Set<string>([commentId]);
  if (!target.parentId) {
    for (const c of comments) {
      if (c.parentId === commentId) idsToRemove.add(c.id);
    }
  }

  let nextComments = comments.filter((c) => !idsToRemove.has(c.id));
  if (target.parentId) {
    nextComments = nextComments.map((c) =>
      c.id === target.parentId
        ? { ...c, replyCount: Math.max(0, (c.replyCount ?? 0) - 1) }
        : c
    );
  }

  saveGlobal({
    ...global,
    [cardId]: {
      countA: current.countA ?? 0,
      countB: current.countB ?? 0,
      comments: nextComments,
    },
  });

  const byMe = loadCommentLikesByMe();
  const cardLikes = byMe[cardId] ?? [];
  const filtered = cardLikes.filter((cid) => !idsToRemove.has(cid));
  if (filtered.length !== cardLikes.length) {
    saveCommentLikesByMe({ ...byMe, [cardId]: filtered });
  }
  return true;
}

function loadCommentLikesByMe(): Record<string, string[]> {
  if (typeof window === "undefined") return {};
  try {
    const key = COMMENT_LIKES_BY_ME_KEY_PREFIX + getCurrentActivityUserId();
    const raw = window.localStorage.getItem(key);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed !== "object" || parsed === null) return {};
    const result: Record<string, string[]> = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (Array.isArray(v)) result[k] = v;
    }
    return result;
  } catch {
    return {};
  }
}

function saveCommentLikesByMe(data: Record<string, string[]>): void {
  if (typeof window === "undefined") return;
  try {
    const key = COMMENT_LIKES_BY_ME_KEY_PREFIX + getCurrentActivityUserId();
    window.localStorage.setItem(key, JSON.stringify(data));
    window.dispatchEvent(new Event(COMMENT_LIKES_BY_ME_UPDATED_EVENT));
  } catch {
    // ignore
  }
}

/** 現在のユーザーがいいねしたコメントID一覧（カードごと）。コメント一覧で赤表示用 */
export function getCommentIdsLikedByCurrentUser(cardId: string): string[] {
  return loadCommentLikesByMe()[normalizeCardIdKey(cardId)] ?? [];
}

export function isCommentLikedByCurrentUser(cardId: string, commentId: string): boolean {
  return getCommentIdsLikedByCurrentUser(cardId).includes(commentId);
}

/**
 * コメントいいねのトグル（1ユーザー1コメント1いいねまで。2回目のタップで解除）。
 * currentCard を渡すとその内容を元に更新する（API取得のみで localStorage にないカードのコメントが消えないようにする）
 * @returns トグル後にいいね済みなら true
 */
export function toggleCommentLike(
  cardId: string,
  commentId: string,
  currentCard?: { countA: number; countB: number; comments: VoteComment[] }
): boolean {
  const nk = normalizeCardIdKey(cardId);
  const byMe = loadCommentLikesByMe();
  const cardLikes = byMe[nk] ?? [];
  const alreadyLiked = cardLikes.includes(commentId);

  const global = loadGlobal();
  const fromStorage = global[nk] ?? { countA: 0, countB: 0, comments: [] };
  const current = currentCard ?? fromStorage;
  const comments = Array.isArray(current.comments) ? current.comments : [];

  const nextComments = comments.map((c) => {
    if (c.id !== commentId) return c;
    const count = c.likeCount ?? 0;
    return {
      ...c,
      likeCount: alreadyLiked ? Math.max(0, count - 1) : count + 1,
    };
  });

  const nextCardLikes = alreadyLiked
    ? cardLikes.filter((id) => id !== commentId)
    : [...cardLikes, commentId];

  saveGlobal({
    ...global,
    [nk]: { countA: current.countA, countB: current.countB, comments: nextComments },
  });
  saveCommentLikesByMe({ ...byMe, [nk]: nextCardLikes });
  return !alreadyLiked;
}

/** @deprecated 名前互換。toggleCommentLike と同じ */
export function addCommentLike(
  cardId: string,
  commentId: string,
  currentCard?: { countA: number; countB: number; comments: VoteComment[] }
): boolean {
  return toggleCommentLike(cardId, commentId, currentCard);
}

/** 未ログイン時のコメント表示名（CommentInput 既定） */
const MY_COMMENT_USER_NAME = "自分";

/**
 * コメントが現在ユーザー本人のものか。
 * ログイン時は表示名（例: user2）で保存されるため、ゲスト時の「自分」と併用する。
 */
export function isCommentAuthoredByCurrentUser(
  commentUserName: string | undefined,
  opts: { isLoggedIn: boolean; displayName?: string | null }
): boolean {
  if (opts.isLoggedIn && typeof opts.displayName === "string" && opts.displayName.length > 0) {
    return commentUserName === opts.displayName;
  }
  return commentUserName === MY_COMMENT_USER_NAME;
}

export function getCardIdsUserCommentedOn(): string[] {
  const auth = getAuth();
  const global = loadGlobal();
  const ids: string[] = [];
  for (const [cardId, a] of Object.entries(global)) {
    if (!Array.isArray(a.comments)) continue;
    const hasMine = a.comments.some((c) =>
      isCommentAuthoredByCurrentUser(c.user?.name, {
        isLoggedIn: auth.isLoggedIn,
        displayName: auth.user?.name,
      })
    );
    if (hasMine) ids.push(cardId);
  }
  return ids;
}

/** 全カードの投票数（countA, countB）のみ0にリセット。コメントは残す。 */
export function resetAllVoteCounts(): void {
  const global = loadGlobal();
  const next: Record<string, GlobalCardData> = {};
  for (const [cardId, data] of Object.entries(global)) {
    next[cardId] = {
      countA: 0,
      countB: 0,
      comments: Array.isArray(data.comments) ? data.comments : [],
    };
  }
  saveGlobal(next);
}

/** 送信直後の楽観表示用 ID（サーバー確定後は除去する） */
export function isOptimisticCommentId(id: string | undefined): boolean {
  return typeof id === "string" && id.startsWith("local-");
}

export function activityHasOptimisticComments(activity: Record<string, CardActivity>): boolean {
  return Object.values(activity).some((row) =>
    (row.comments ?? []).some((c) => isOptimisticCommentId(c.id))
  );
}

export type PersistActivityOptions = {
  /** 未指定時は activity に local-* があれば自動で true（リロード直後の欠落防止） */
  includeOptimisticComments?: boolean;
};

function isSameCommentPayload(a: VoteComment, b: VoteComment): boolean {
  return (
    a.text === b.text &&
    a.user?.name === b.user?.name &&
    (a.parentId ?? "") === (b.parentId ?? "")
  );
}

/** 楽観 local-* がサーバー確定コメントに置き換わったか（リロード時の誤削除防止） */
function isOptimisticCommentConfirmedOnServer(
  optimistic: VoteComment,
  serverComments: VoteComment[]
): boolean {
  const optTime = new Date(optimistic.date ?? 0).getTime();
  return serverComments.some((s) => {
    if (!s?.id || isOptimisticCommentId(s.id)) return false;
    if (!isSameCommentPayload(optimistic, s)) return false;
    const serverTime = new Date(s.date ?? 0).getTime();
    if (Number.isNaN(optTime) || Number.isNaN(serverTime)) return true;
    return Math.abs(serverTime - optTime) < 10 * 60 * 1000;
  });
}

/**
 * API 取得結果とローカル state のコメントをマージ。
 * local-* はサーバーに同内容の確定コメントがあるときだけ除去（他カードのコメントがあるだけでは捨てない）。
 */
export function mergeCommentsForActivitySync(
  prevComments: VoteComment[] | undefined,
  nextComments: VoteComment[] | undefined
): VoteComment[] {
  const prev = prevComments ?? [];
  const next = nextComments ?? [];
  const serverComments = next.filter((c) => c?.id && !isOptimisticCommentId(c.id));
  const prevKept = prev.filter((c) => {
    if (!isOptimisticCommentId(c.id)) return true;
    return !isOptimisticCommentConfirmedOnServer(c, serverComments);
  });
  return mergeVoteComments(prevKept, next);
}

/**
 * KV 同期後の activity を localStorage に書き戻す（リロード直後の getAllActivity / 投票済み表示用）。
 * local-* は state に残っている間は保存する（POST 完了前のリロード対策）。
 */
export function persistAllActivityToLocalStorage(
  activity: Record<string, CardActivity>,
  options?: PersistActivityOptions
): void {
  if (typeof window === "undefined") return;
  const includeOptimistic =
    options?.includeOptimisticComments ?? activityHasOptimisticComments(activity);
  const global = loadGlobal();
  const user = loadUserSelections();
  const nextGlobal: Record<string, GlobalCardData> = { ...global };
  const nextUser: Record<string, UserVoteSelectionRow> = { ...user };

  const normalizedRows = new Map<string, CardActivity>();
  for (const [rawId, row] of Object.entries(activity)) {
    const nk = normalizeCardIdKey(rawId);
    const existing = normalizedRows.get(nk);
    if (!existing) {
      normalizedRows.set(nk, row);
      continue;
    }
    normalizedRows.set(nk, {
      countA: Math.max(existing.countA, row.countA),
      countB: Math.max(existing.countB, row.countB),
      comments: mergeVoteComments(existing.comments, row.comments),
      userSelectedOption: existing.userSelectedOption ?? row.userSelectedOption,
      userVotedAt: existing.userVotedAt ?? row.userVotedAt,
    });
  }

  for (const nk of normalizedRows.keys()) {
    for (const k of Object.keys(nextGlobal)) {
      if (normalizeCardIdKey(k) === nk) delete nextGlobal[k];
    }
    for (const k of Object.keys(nextUser)) {
      if (normalizeCardIdKey(k) === nk) delete nextUser[k];
    }
  }

  for (const [nk, row] of normalizedRows) {
    const comments = (row.comments ?? []).filter(
      (c) => includeOptimistic || !isOptimisticCommentId(c.id)
    );
    nextGlobal[nk] = {
      countA: row.countA ?? 0,
      countB: row.countB ?? 0,
      comments,
    };
    if (row.userSelectedOption === "A" || row.userSelectedOption === "B") {
      nextUser[nk] = {
        userSelectedOption: row.userSelectedOption,
        ...(row.userVotedAt ? { votedAt: row.userVotedAt } : {}),
      };
    }
  }

  saveGlobal(nextGlobal);
  saveUserSelections(nextUser);
}

/** コメント一覧を ID でマージ（新しい方を優先） */
export function mergeVoteComments(
  prev: VoteComment[] | undefined,
  next: VoteComment[] | undefined
): VoteComment[] {
  const p = Array.isArray(prev) ? prev : [];
  const n = Array.isArray(next) ? next : [];
  if (p.length === 0) return n;
  if (n.length === 0) return p;
  const byId = new Map<string, VoteComment>();
  for (const c of p) {
    if (c && typeof c.id === "string") byId.set(c.id, c);
  }
  for (const c of n) {
    if (c && typeof c.id === "string") byId.set(c.id, c);
  }
  const merged = Array.from(byId.values());
  merged.sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
  return merged;
}

/**
 * `activity["3"]` と `activity["seed-3"]` のようにキーが分かれていても表示用に統合する。
 */
export function resolveActivityForCard(
  activity: Record<string, CardActivity>,
  cardId: string
): CardActivity {
  const nk = normalizeCardIdKey(cardId);
  const keys = nk === cardId ? [nk] : [nk, cardId];
  let countA = 0;
  let countB = 0;
  let comments: VoteComment[] = [];
  let userSelectedOption: "A" | "B" | undefined;
  let userVotedAt: string | undefined;
  for (const key of keys) {
    const a = activity[key];
    if (!a) continue;
    countA = Math.max(countA, a.countA ?? 0);
    countB = Math.max(countB, a.countB ?? 0);
    comments = mergeVoteComments(comments, a.comments);
    if (a.userSelectedOption === "A" || a.userSelectedOption === "B") {
      userSelectedOption = a.userSelectedOption;
    }
    if (typeof a.userVotedAt === "string" && a.userVotedAt) {
      userVotedAt = a.userVotedAt;
    }
  }
  return { countA, countB, comments, userSelectedOption, userVotedAt };
}

/** ベースカードと活動をマージした表示用の countA, countB, commentCount を返す */
export function getMergedCounts(
  baseCountA: number,
  baseCountB: number,
  _baseCommentCount: number,
  activity: CardActivity
): { countA: number; countB: number; commentCount: number } {
  const a = activity.countA ?? 0;
  const b = activity.countB ?? 0;
  /** コメント数は実際に保存されているコメント件数のみ反映 */
  const commentCount = Array.isArray(activity.comments) ? activity.comments.length : 0;
  return {
    countA: baseCountA + a,
    countB: baseCountB + b,
    commentCount,
  };
}
