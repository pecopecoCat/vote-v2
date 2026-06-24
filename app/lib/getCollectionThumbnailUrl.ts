import type { Collection } from "../data/collections";
import type { VoteCardData } from "../data/voteCards";
import { resolveCardBackgroundUrl } from "./resolveCardBackgroundUrl";
import { resolveVoteCardByStableId } from "./resolveVoteCardByStableId";

/** コレクション一覧タイル用：設定画像 → 先頭カード背景の順で解決 */
export function getCollectionThumbnailUrl(
  collection: Pick<Collection, "cardIds" | "coverImageUrl">,
  createdVotesForTimeline: VoteCardData[] = []
): string | null {
  if (collection.coverImageUrl) return collection.coverImageUrl;
  const firstId = collection.cardIds[0];
  if (!firstId) return null;
  const card = resolveVoteCardByStableId(firstId, createdVotesForTimeline);
  if (!card) return null;
  return resolveCardBackgroundUrl(card, firstId);
}
