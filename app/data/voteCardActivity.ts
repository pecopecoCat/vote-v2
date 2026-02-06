/**
 * VOTEカードの「活動データ」：投票数（2択のcount up）とコメント情報を保持・読み込みする。
 * ベースのカードデータ（voteCards / createdVotes）にマージして HOME・個別ページ・VoteCard に反映する。
 */

/** コメント1件：コメントしたユーザー・日付・テキスト */
export interface VoteComment {
  id: string;
  /** コメントしたユーザー */
  user: { name: string; iconUrl?: string };
  /** コメントされた日付（ISO文字列） */
  date: string;
  /** コメントテキスト */
  text: string;
}

/** カードごとの活動：投票数（2択の加算）とコメント一覧。この端末で投票した選択も保持。 */
export interface CardActivity {
  /** Aに投票した人数（この端末での加算分を含む） */
  countA: number;
  /** Bに投票した人数（この端末での加算分を含む） */
  countB: number;
  /** コメント一覧（登録されている情報） */
  comments: VoteComment[];
  /** この端末のユーザーが選んだ選択肢（投票済み表示用） */
  userSelectedOption?: "A" | "B";
}

const STORAGE_KEY = "vote_card_activity";

function loadAll(): Record<string, CardActivity> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, CardActivity>;
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

function saveAll(data: Record<string, CardActivity>): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // ignore
  }
}

/** カードIDに対応する活動データを取得（なければ空のデフォルト） */
export function getActivity(cardId: string): CardActivity {
  const all = loadAll();
  const a = all[cardId];
  if (!a) return { countA: 0, countB: 0, comments: [] };
  return {
    countA: typeof a.countA === "number" && a.countA >= 0 ? a.countA : 0,
    countB: typeof a.countB === "number" && a.countB >= 0 ? a.countB : 0,
    comments: Array.isArray(a.comments) ? a.comments : [],
    userSelectedOption: a.userSelectedOption === "A" || a.userSelectedOption === "B" ? a.userSelectedOption : undefined,
  };
}

/** 全カードの活動を取得（HOMEなどで一括マージする用） */
export function getAllActivity(): Record<string, CardActivity> {
  return loadAll();
}

/** 2択に投票する：countA または countB を +1 し、この端末の選択を記録 */
export function addVote(cardId: string, option: "A" | "B"): void {
  const all = loadAll();
  const current = all[cardId] ?? { countA: 0, countB: 0, comments: [] };
  const next: CardActivity = {
    countA: current.countA + (option === "A" ? 1 : 0),
    countB: current.countB + (option === "B" ? 1 : 0),
    comments: Array.isArray(current.comments) ? current.comments : [],
    userSelectedOption: option,
  };
  saveAll({ ...all, [cardId]: next });
}

/** コメントを追加：コメント情報（ユーザー・日付・テキスト）を登録しコメント数を更新 */
export function addComment(
  cardId: string,
  comment: { user: { name: string; iconUrl?: string }; text: string }
): void {
  const all = loadAll();
  const current = all[cardId] ?? { countA: 0, countB: 0, comments: [] };
  const comments = Array.isArray(current.comments) ? current.comments : [];
  const newComment: VoteComment = {
    id: `comment-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    user: comment.user,
    date: new Date().toISOString(),
    text: comment.text,
  };
  const next: CardActivity = {
    countA: current.countA ?? 0,
    countB: current.countB ?? 0,
    comments: [...comments, newComment],
    userSelectedOption: current.userSelectedOption,
  };
  saveAll({ ...all, [cardId]: next });
}

/** 自分がコメントしたカードID一覧（コメント投稿時の user.name が「自分」のもの）。新しい順。 */
const MY_COMMENT_USER_NAME = "自分";

export function getCardIdsUserCommentedOn(): string[] {
  const all = loadAll();
  const ids: string[] = [];
  for (const [cardId, a] of Object.entries(all)) {
    if (!Array.isArray(a.comments)) continue;
    const hasMine = a.comments.some((c) => c.user?.name === MY_COMMENT_USER_NAME);
    if (hasMine) ids.push(cardId);
  }
  return ids;
}

/** ベースカードと活動をマージした表示用の countA, countB, commentCount を返す */
export function getMergedCounts(
  baseCountA: number,
  baseCountB: number,
  baseCommentCount: number,
  activity: CardActivity
): { countA: number; countB: number; commentCount: number } {
  const a = activity.countA ?? 0;
  const b = activity.countB ?? 0;
  const commentLen = Array.isArray(activity.comments) ? activity.comments.length : 0;
  return {
    countA: baseCountA + a,
    countB: baseCountB + b,
    commentCount: baseCommentCount + commentLen,
  };
}
