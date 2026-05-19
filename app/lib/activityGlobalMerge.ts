import { normalizeCardIdKey } from "./normalize";
import type { GlobalCardData } from "./kvTimelineReads";

type VoteCommentRow = GlobalCardData["comments"][number];

/** 同一カードの別キー（`3` と `seed-3` 等）に分かれた global 行をマージする */
export function mergeGlobalCardData(
  a: GlobalCardData | undefined,
  b: GlobalCardData | undefined
): GlobalCardData {
  const countA = Math.max(a?.countA ?? 0, b?.countA ?? 0);
  const countB = Math.max(a?.countB ?? 0, b?.countB ?? 0);
  const comments = mergeCommentRows(a?.comments, b?.comments);
  return { countA, countB, comments };
}

function mergeCommentRows(
  prev: VoteCommentRow[] | undefined,
  next: VoteCommentRow[] | undefined
): VoteCommentRow[] {
  const p = Array.isArray(prev) ? prev : [];
  const n = Array.isArray(next) ? next : [];
  if (p.length === 0) return n;
  if (n.length === 0) return p;
  const byId = new Map<string, VoteCommentRow>();
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

/** KV / GET 用: 正規化キーに揃えたうえでエイリアスキー分をマージして読む */
export function pickGlobalCardFromStore(
  global: Record<string, GlobalCardData>,
  cardId: string
): GlobalCardData {
  const nk = normalizeCardIdKey(cardId);
  let merged: GlobalCardData = { countA: 0, countB: 0, comments: [] };
  for (const [k, v] of Object.entries(global)) {
    if (normalizeCardIdKey(k) === nk) {
      merged = mergeGlobalCardData(merged, v);
    }
  }
  return merged;
}

/** KV 書き込み: 正規化キーに保存し、エイリアスキーを削除する */
export function writeGlobalCardToStore(
  global: Record<string, GlobalCardData>,
  cardId: string,
  card: GlobalCardData
): Record<string, GlobalCardData> {
  const nk = normalizeCardIdKey(cardId);
  const next: Record<string, GlobalCardData> = { ...global, [nk]: card };
  for (const k of Object.keys(next)) {
    if (k !== nk && normalizeCardIdKey(k) === nk) {
      delete next[k];
    }
  }
  return next;
}

export function normalizeKeyedGlobalRows(
  raw: Record<string, GlobalCardData>
): Record<string, GlobalCardData> {
  const out: Record<string, GlobalCardData> = {};
  for (const [k, v] of Object.entries(raw)) {
    const nk = normalizeCardIdKey(k);
    out[nk] = mergeGlobalCardData(out[nk], v);
  }
  return out;
}

export type UserSelectionRow = { userSelectedOption?: "A" | "B"; votedAt?: string };

function mergeUserSelectionRow(
  a: UserSelectionRow | undefined,
  b: UserSelectionRow | undefined
): UserSelectionRow | undefined {
  const lHas = Boolean(a?.userSelectedOption || a?.votedAt);
  const sHas = Boolean(b?.userSelectedOption || b?.votedAt);
  if (!lHas && !sHas) return undefined;
  if (!lHas) return b;
  if (!sHas) return a;
  const lt = a!.votedAt ?? "";
  const st = b!.votedAt ?? "";
  if (st > lt) return { ...b! };
  if (lt > st) return { ...a! };
  return {
    userSelectedOption: b!.userSelectedOption ?? a!.userSelectedOption,
    votedAt: st || lt,
  };
}

function parseUserSelectionValue(v: unknown): UserSelectionRow | undefined {
  if (v === "A" || v === "B") return { userSelectedOption: v };
  if (!v || typeof v !== "object") return undefined;
  const o = v as UserSelectionRow;
  if (o.userSelectedOption !== "A" && o.userSelectedOption !== "B" && !o.votedAt) return undefined;
  return {
    ...(o.userSelectedOption === "A" || o.userSelectedOption === "B"
      ? { userSelectedOption: o.userSelectedOption }
      : {}),
    ...(typeof o.votedAt === "string" ? { votedAt: o.votedAt } : {}),
  };
}

export function pickUserSelectionFromStore(
  raw: Record<string, unknown>,
  cardId: string
): UserSelectionRow | undefined {
  const nk = normalizeCardIdKey(cardId);
  let merged: UserSelectionRow | undefined;
  for (const [k, v] of Object.entries(raw)) {
    if (normalizeCardIdKey(k) !== nk) continue;
    merged = mergeUserSelectionRow(merged, parseUserSelectionValue(v));
  }
  return merged;
}

export function normalizeKeyedUserSelections(
  raw: Record<string, unknown>
): Record<string, UserSelectionRow> {
  const out: Record<string, UserSelectionRow> = {};
  for (const [k, v] of Object.entries(raw)) {
    const row = parseUserSelectionValue(v);
    if (!row) continue;
    const nk = normalizeCardIdKey(k);
    const merged = mergeUserSelectionRow(out[nk], row);
    if (merged) out[nk] = merged;
  }
  return out;
}

export function writeUserSelectionToStore(
  userRaw: Record<string, UserSelectionRow>,
  cardId: string,
  row: UserSelectionRow
): Record<string, UserSelectionRow> {
  const nk = normalizeCardIdKey(cardId);
  const next: Record<string, UserSelectionRow> = { ...userRaw, [nk]: row };
  for (const k of Object.keys(next)) {
    if (k !== nk && normalizeCardIdKey(k) === nk) {
      delete next[k];
    }
  }
  return next;
}
