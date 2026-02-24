import type { VoteCardData } from "./voteCards";
import type { VoteCardPattern } from "../components/VoteCard";
import { getCurrentActivityUserId } from "./auth";

const STORAGE_KEY_PREFIX = "vote_created_cards_";
const LEGACY_STORAGE_KEY = "vote_created_cards";

const VALID_PATTERNS: VoteCardPattern[] = [
  "geometric-stripes",
  "pink-blue",
  "blue-cyan",
  "yellow-loops",
  "orange-purple",
];

function isValidPattern(v: unknown): v is VoteCardPattern {
  return typeof v === "string" && (VALID_PATTERNS as string[]).includes(v);
}

/** localStorage の生データを VoteCardData に正規化（欠損・古い形式対策） */
function normalizeCard(raw: unknown): VoteCardData | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const question = typeof o.question === "string" ? o.question : "";
  const optionA = typeof o.optionA === "string" ? o.optionA : "";
  const optionB = typeof o.optionB === "string" ? o.optionB : "";
  if (!question.trim() || !optionA.trim() || !optionB.trim()) return null;
  const patternType: VoteCardPattern = isValidPattern(o.patternType) ? o.patternType : "yellow-loops";
  const countA = typeof o.countA === "number" && o.countA >= 0 ? o.countA : 0;
  const countB = typeof o.countB === "number" && o.countB >= 0 ? o.countB : 0;
  const commentCount = typeof o.commentCount === "number" && o.commentCount >= 0 ? o.commentCount : 0;
  const tags = Array.isArray(o.tags)
    ? (o.tags.filter((t): t is string => typeof t === "string") as string[])
    : undefined;
  return {
    patternType,
    question,
    optionA,
    optionB,
    countA,
    countB,
    commentCount,
    tags: tags?.length ? tags : undefined,
    readMoreText: typeof o.readMoreText === "string" ? o.readMoreText : undefined,
    creator:
      o.creator && typeof o.creator === "object" && typeof (o.creator as Record<string, unknown>).name === "string"
        ? (o.creator as { name: string; iconUrl?: string })
        : undefined,
    bookmarked: typeof o.bookmarked === "boolean" ? o.bookmarked : undefined,
    createdAt: typeof o.createdAt === "string" ? o.createdAt : undefined,
    backgroundImageUrl: typeof o.backgroundImageUrl === "string" ? o.backgroundImageUrl : undefined,
    id: typeof o.id === "string" ? o.id : undefined,
    visibility: o.visibility === "private" ? "private" : "public",
    optionAImageUrl: typeof o.optionAImageUrl === "string" ? o.optionAImageUrl : undefined,
    optionBImageUrl: typeof o.optionBImageUrl === "string" ? o.optionBImageUrl : undefined,
    periodEnd: typeof o.periodEnd === "string" ? o.periodEnd : undefined,
  };
}

function loadForUser(userId: string): VoteCardData[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY_PREFIX + userId);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const result: VoteCardData[] = [];
    for (const item of parsed) {
      const card = normalizeCard(item);
      if (card) result.push(card);
    }
    return result;
  } catch {
    return [];
  }
}

function saveForUser(userId: string, list: VoteCardData[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY_PREFIX + userId, JSON.stringify(list));
  } catch {
    // ignore
  }
}

/** 現在ログイン中のユーザーが作ったVOTEのみ（mypageの「作ったVOTE」用） */
export function getCreatedVotes(): VoteCardData[] {
  const userId = getCurrentActivityUserId();
  let list = loadForUser(userId);
  if (list.length === 0 && (userId === "user1" || userId === "user2")) {
    const legacy = loadLegacy();
    if (legacy.length > 0) {
      list = legacy;
      saveForUser(userId, list);
    }
  }
  return list;
}

function loadLegacy(): VoteCardData[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const result: VoteCardData[] = [];
    for (const item of parsed) {
      const card = normalizeCard(item);
      if (card) result.push(card);
    }
    return result;
  } catch {
    return [];
  }
}

/** タイムライン・カード解決用：全ユーザーの作ったVOTEをマージ（user1 + user2） */
export function getCreatedVotesForTimeline(): VoteCardData[] {
  if (typeof window === "undefined") return [];
  const fromUser1 = loadForUser("user1");
  const fromUser2 = loadForUser("user2");
  return [...fromUser1, ...fromUser2];
}

export function addCreatedVote(card: VoteCardData): void {
  const userId = getCurrentActivityUserId();
  const list = loadForUser(userId);
  list.unshift(card);
  saveForUser(userId, list);
}

/** 作ったVOTEを削除（現在ユーザー分のみ。cardId = card.id ?? card.question） */
export function deleteCreatedVote(cardId: string): void {
  const userId = getCurrentActivityUserId();
  const list = loadForUser(userId).filter((c) => (c.id ?? c.question) !== cardId);
  saveForUser(userId, list);
}
