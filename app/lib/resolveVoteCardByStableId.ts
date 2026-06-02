import { getVoteCardById, voteCardsData, type VoteCardData } from "../data/voteCards";

/** stableId（seed-N / created-xxx / 数値 index）からカードを取得 */
export function resolveVoteCardByStableId(
  id: string,
  createdVotesForTimeline: VoteCardData[] = []
): VoteCardData | null {
  if (id.startsWith("seed-")) {
    const index = parseInt(id.slice(5), 10);
    if (Number.isNaN(index) || index < 0 || index >= voteCardsData.length) return null;
    return { ...voteCardsData[index], id: `seed-${index}` };
  }
  if (id.startsWith("created-")) {
    return createdVotesForTimeline.find((c) => c.id === id) ?? null;
  }
  const legacy = getVoteCardById(id);
  if (legacy) return { ...legacy, id: `seed-${id}` };
  return null;
}
