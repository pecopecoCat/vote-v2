/**
 * 投票期間（開始・終了の ISO）に基づく表示・可否判定。
 * periodEnd のみの旧データは「終了前まで投票可」（開始制限なし）とする。
 */

import type { VoteCardData } from "./voteCards";
import { voteCardsData, getVoteCardById } from "./voteCards";

/** カードIDから期間メタを解決（作成VOTE・シード・数値ID） */
export function resolveCardForVotePeriod(
  cardId: string,
  timeline: VoteCardData[]
): Pick<VoteCardData, "periodStart" | "periodEnd"> | null {
  const fromTimeline = timeline.find((c) => (c.id ?? "") === cardId);
  if (fromTimeline) return fromTimeline;
  if (cardId.startsWith("seed-")) {
    const idx = parseInt(cardId.slice(5), 10);
    if (!Number.isNaN(idx) && idx >= 0 && idx < voteCardsData.length) {
      return voteCardsData[idx];
    }
    return null;
  }
  return getVoteCardById(cardId);
}

export function isVotingAllowedNow(periodStart: string | undefined, periodEnd: string | undefined): boolean {
  if (!periodEnd) return true;
  const now = Date.now();
  const endMs = new Date(periodEnd).getTime();
  if (Number.isNaN(endMs)) return true;
  if (now > endMs) return false;
  if (periodStart) {
    const startMs = new Date(periodStart).getTime();
    if (!Number.isNaN(startMs) && now < startMs) return false;
  }
  return true;
}

/** タグ下などに表示する1行。期間未設定は空文字 */
export function getVotePeriodStatusText(periodStart: string | undefined, periodEnd: string | undefined): string {
  if (!periodEnd) return "";
  const now = Date.now();
  const endMs = new Date(periodEnd).getTime();
  if (Number.isNaN(endMs)) return "";
  if (now > endMs) return "投票期間終了";
  if (periodStart) {
    const startMs = new Date(periodStart).getTime();
    if (!Number.isNaN(startMs) && now < startMs) {
      const diffMs = startMs - now;
      const days = Math.ceil(diffMs / (24 * 60 * 60 * 1000));
      return `投票開始まで${days}日`;
    }
  }
  const diffMs = endMs - now;
  const days = Math.ceil(diffMs / (24 * 60 * 60 * 1000));
  return `投票終了まで${days}日`;
}
