import type { Collection } from "../data/collections";
import type { VoteCardData } from "../data/voteCards";
import { resolveCardBackgroundUrl } from "./resolveCardBackgroundUrl";
import { resolveVoteCardByStableId } from "./resolveVoteCardByStableId";

/** コレクション一覧タイル用：先頭カードの背景画像、なければ null */
export function getCollectionThumbnailUrl(
  collection: Pick<Collection, "cardIds">,
  createdVotesForTimeline: VoteCardData[] = []
): string | null {
  const firstId = collection.cardIds[0];
  if (!firstId) return null;
  const card = resolveVoteCardByStableId(firstId, createdVotesForTimeline);
  if (!card) return null;
  return resolveCardBackgroundUrl(card, firstId);
}
