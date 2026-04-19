/**
 * VOTEカードの「活動データ」：投票数・コメントは全ユーザー共通の総数で保存。
 * 誰がどの選択肢を選んだか（投票済み表示）だけユーザー別に保存。
 *
 * - 総投票数・コメント一覧 → vote_card_activity_global（ユーザーに依存しない）
 * - 現在ユーザーの投票選択 → vote_card_activity_${userId}（ログイン/ゲスト別）
 */

import { getAuth, getCurrentActivityUserId } from "./auth";

/** コメント1件：コメントしたユーザー・日付・テキスト・いいね数・返信先 */
export interface VoteComment {
  id: string;
  /** コメントしたユーザー */
  user: { name: string; iconUrl?: string };
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

export type UserVoteSelectionRow = { userSelectedOption?: "A" | "B"; votedAt?: string };

function loadUserSelections(): Record<string, UserVoteSelectionRow> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(getUserStorageKey());
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (typeof parsed !== "object" || parsed === null) return {};
    const out: Record<string, UserVoteSelectionRow> = {};
    for (const [cardId, v] of Object.entries(parsed)) {
      if (typeof v === "string" && (v === "A" || v === "B")) {
        out[cardId] = { userSelectedOption: v };
        continue;
      }
      if (v && typeof v === "object") {
        const o = v as Record<string, unknown>;
        const opt = o.userSelectedOption === "A" || o.userSelectedOption === "B" ? o.userSelectedOption : undefined;
        const votedAt = typeof o.votedAt === "string" ? o.votedAt : undefined;
        if (opt || votedAt) out[cardId] = { userSelectedOption: opt, votedAt };
      }
    }
    return out;
  } catch {
    return {};
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
  const cardIds = new Set([...Object.keys(global), ...Object.keys(user)]);
  const result: Record<string, CardActivity> = {};
  for (const id of cardIds) {
    result[id] = normalizeCardActivity(global[id], user[id]);
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
  commenterVoteOption?: "A" | "B"
): void {
  const global = loadGlobal();
  const current = global[cardId] ?? { countA: 0, countB: 0, comments: [] };
  const comments = Array.isArray(current.comments) ? current.comments : [];
  const newComment: VoteComment = {
    id: `comment-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    user: comment.user,
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
  return loadCommentLikesByMe()[cardId] ?? [];
}

/**
 * コメントにいいねを追加。自分がいいねした一覧にも追加。
 * currentCard を渡すとその内容を元に更新する（API取得のみで localStorage にないカードのコメントが消えないようにする）
 */
export function addCommentLike(
  cardId: string,
  commentId: string,
  currentCard?: { countA: number; countB: number; comments: VoteComment[] }
): void {
  const global = loadGlobal();
  const fromStorage = global[cardId] ?? { countA: 0, countB: 0, comments: [] };
  const current = currentCard ?? fromStorage;
  const comments = Array.isArray(current.comments) ? current.comments : [];
  const nextComments = comments.map((c) =>
    c.id === commentId ? { ...c, likeCount: (c.likeCount ?? 0) + 1 } : c
  );
  saveGlobal({
    ...global,
    [cardId]: { countA: current.countA, countB: current.countB, comments: nextComments },
  });
  const byMe = loadCommentLikesByMe();
  const cardLikes = byMe[cardId] ?? [];
  if (!cardLikes.includes(commentId)) {
    saveCommentLikesByMe({ ...byMe, [cardId]: [...cardLikes, commentId] });
  }
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
