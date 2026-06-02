import { CARD_BACKGROUND_IMAGES, resolveStableVoteCardId, type VoteCardData } from "../data/voteCards";

const backgroundCache = new Map<string, string>();

/** カード ID から安定した背景 URL（同一カードは常に同じ画像） */
export function resolveCardBackgroundUrl(card: VoteCardData, cardId?: string): string {
  if (card.backgroundImageUrl) return card.backgroundImageUrl;
  const id = cardId ?? resolveStableVoteCardId(card);
  const cached = backgroundCache.get(id);
  if (cached) return cached;
  let h = 0;
  for (let i = 0; i < id.length; i++) h = ((h << 5) - h + id.charCodeAt(i)) | 0;
  const url = CARD_BACKGROUND_IMAGES[Math.abs(h) % CARD_BACKGROUND_IMAGES.length];
  backgroundCache.set(id, url);
  return url;
}
