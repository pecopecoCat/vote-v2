"use client";

import Link from "next/link";
import { memo, useMemo } from "react";
import { COLLECTION_VISIBILITY_LABEL } from "../data/collectionCategories";
import type { CollectionVisibility } from "../data/collections";
import type { VoteCardData } from "../data/voteCards";
import { getCollectionThumbnailUrl } from "../lib/getCollectionThumbnailUrl";
import type { TimelineCollection } from "../lib/voteTimeline";
import { getCollectionGradientStyle, type CollectionGradient } from "../data/search";

export type CollectionFeedCardProps = {
  title: string;
  href: string;
  thumbnailUrl?: string | null;
  gradient?: CollectionGradient;
  color?: string;
  cardCount: number;
  visibility: CollectionVisibility;
};

function CollectionFeedCard({
  title,
  href,
  thumbnailUrl,
  gradient = "orange-yellow",
  color,
  cardCount,
  visibility,
}: CollectionFeedCardProps) {
  const gradientStyle = getCollectionGradientStyle(gradient, color);
  const meta = `登録数 ${cardCount}件 · ${COLLECTION_VISIBILITY_LABEL[visibility]}`;

  return (
    <Link href={href} prefetch={false} className="block min-w-0">
      <article className="vote-card-outer">
        <div className="vote-card-outer__inner flex items-center gap-3 px-4 py-3.5">
          <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full ring-1 ring-black/[0.06]">
            {thumbnailUrl ? (
              <img
                src={thumbnailUrl}
                alt=""
                className="h-full w-full object-cover"
                width={56}
                height={56}
                decoding="async"
              />
            ) : (
              <span className="block h-full w-full" style={gradientStyle} aria-hidden />
            )}
          </span>
          <div className="min-w-0 flex-1 text-left">
            <h3
              className="w-full min-w-0 truncate text-base font-bold leading-snug text-[#191919]"
              title={title}
            >
              {title}
            </h3>
            <p className="mt-0.5 w-full min-w-0 truncate text-xs leading-snug text-[#8A8A8A]">{meta}</p>
          </div>
        </div>
      </article>
    </Link>
  );
}

export const TimelineCollectionFeedCard = memo(function TimelineCollectionFeedCard({
  collection,
  createdVotesForTimeline,
}: {
  collection: TimelineCollection;
  createdVotesForTimeline: VoteCardData[];
}) {
  const thumbnailUrl = useMemo(
    () => getCollectionThumbnailUrl(collection, createdVotesForTimeline),
    [collection, createdVotesForTimeline]
  );

  return (
    <CollectionFeedCard
      title={collection.title}
      href={`/collection/${collection.id}`}
      thumbnailUrl={thumbnailUrl}
      gradient={collection.gradient}
      color={collection.color}
      cardCount={collection.cardIds.length}
      visibility={collection.visibility}
    />
  );
});

export default memo(CollectionFeedCard);
