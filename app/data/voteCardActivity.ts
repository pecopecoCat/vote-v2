/**
 * VOTEカードの「活動データ」：投票数・コメントは全ユーザー共通の総数で保存。
 * 誰がどの選択肢を選んだか（投票済み表示）だけユーザー別に保存。
 *
 * - 総投票数・コメント一覧 → vote_card_activity_global（ユーザーに依存しない）
 * - 現在ユーザーの投票選択 → vote_card_activity_${userId}（ログイン/ゲスト別）
 */

import { getCurrentActivityUserId } from "./auth";

/** コメント1件：コメントしたユーザー・日付・テキスト・いいね数 */
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
const MAX_VOTE_EVENTS = 100;

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
  } catch {
    // ignore
  }
}

function loadUserSelections(): Record<string, { userSelectedOption?: "A" | "B" }> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(getUserStorageKey());
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, { userSelectedOption?: "A" | "B" }>;
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

function saveUserSelections(data: Record<string, { userSelectedOption?: "A" | "B" }>): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(getUserStorageKey(), JSON.stringify(data));
  } catch {
    // ignore
  }
}

function normalizeCardActivity(g: GlobalCardData | undefined, u: { userSelectedOption?: "A" | "B" } | undefined): CardActivity {
  return {
    countA: g && typeof g.countA === "number" && g.countA >= 0 ? g.countA : 0,
    countB: g && typeof g.countB === "number" && g.countB >= 0 ? g.countB : 0,
    comments: g && Array.isArray(g.comments) ? g.comments : [],
    userSelectedOption: u?.userSelectedOption === "A" || u?.userSelectedOption === "B" ? u.userSelectedOption : undefined,
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
  saveUserSelections({ ...user, [cardId]: { userSelectedOption: option } });

  const events = loadVoteEvents();
  events.push({ cardId, date: new Date().toISOString() });
  saveVoteEvents(events);
}

/** コメントを追加：総数側に登録（全ユーザー共通） */
export function addComment(
  cardId: string,
  comment: { user: { name: string; iconUrl?: string }; text: string }
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
  };
  const next: GlobalCardData = {
    countA: current.countA ?? 0,
    countB: current.countB ?? 0,
    comments: [...comments, newComment],
  };
  saveGlobal({ ...global, [cardId]: next });
}

/** コメントにいいねを追加（お知らせ「送ったコメントにいいね」用） */
export function addCommentLike(cardId: string, commentId: string): void {
  const global = loadGlobal();
  const current = global[cardId] ?? { countA: 0, countB: 0, comments: [] };
  const comments = Array.isArray(current.comments) ? current.comments : [];
  const nextComments = comments.map((c) =>
    c.id === commentId ? { ...c, likeCount: (c.likeCount ?? 0) + 1 } : c
  );
  saveGlobal({
    ...global,
    [cardId]: { countA: current.countA, countB: current.countB, comments: nextComments },
  });
}

/** 自分がコメントしたカードID一覧（総数側のコメントで user.name が「自分」のもの） */
const MY_COMMENT_USER_NAME = "自分";

export function getCardIdsUserCommentedOn(): string[] {
  const global = loadGlobal();
  const ids: string[] = [];
  for (const [cardId, a] of Object.entries(global)) {
    if (!Array.isArray(a.comments)) continue;
    const hasMine = a.comments.some((c) => c.user?.name === MY_COMMENT_USER_NAME);
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
