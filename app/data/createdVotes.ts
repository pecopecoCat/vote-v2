import type { VoteCardData } from "./voteCards";
import type { VoteCardPattern } from "../components/VoteCard";

const STORAGE_KEY = "vote_created_cards";

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
  };
}

export function getCreatedVotes(): VoteCardData[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
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

export function addCreatedVote(card: VoteCardData): void {
  const list = getCreatedVotes();
  list.unshift(card);
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // ignore
  }
}
