import { getSeedCollectionCoverImageUrl, type Collection } from "../data/collections";
import type { VoteCardData } from "../data/voteCards";
import { resolveCardBackgroundUrl } from "./resolveCardBackgroundUrl";
import { resolveVoteCardByStableId } from "./resolveVoteCardByStableId";

/** コレクション一覧タイル用：設定画像 → シード代表画像 → 先頭カード背景の順で解決 */
export function getCollectionThumbnailUrl(
  collection: Pick<Collection, "id" | "cardIds" | "coverImageUrl">,
  createdVotesForTimeline: VoteCardData[] = []
): string | null {
  if (collection.coverImageUrl) return collection.coverImageUrl;
  const seedCover = getSeedCollectionCoverImageUrl(collection.id);
  if (seedCover) return seedCover;
  const firstId = collection.cardIds[0];
  if (!firstId) return null;
  const card = resolveVoteCardByStableId(firstId, createdVotesForTimeline);
  if (!card) return null;
  return resolveCardBackgroundUrl(card, firstId);
}
