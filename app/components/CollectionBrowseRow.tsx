"use client";

import Link from "next/link";
import { memo } from "react";
import type { Collection } from "../data/collections";
import {
  COLLECTION_CATEGORY_OPTIONS,
  COLLECTION_VISIBILITY_LABEL,
  resolveCollectionCategory,
} from "../data/collectionCategories";
import { getCollectionGradientStyle } from "../data/search";

export function formatCollectionBrowseMeta(collection: Collection): string {
  const parts: string[] = [];
  parts.push(COLLECTION_VISIBILITY_LABEL[collection.visibility]);
  const category = resolveCollectionCategory(collection);
  const categoryLabel = COLLECTION_CATEGORY_OPTIONS.find((c) => c.id === category)?.label;
  if (categoryLabel) parts.push(categoryLabel);
  parts.push(`${collection.cardIds.length}件`);
  return parts.join(" · ");
}

export type CollectionBrowseRowProps = {
  collection: Collection;
  thumbnailUrl?: string | null;
  href: string;
};

/** コレクション追加ピッカーと同系統の横並び行（検索結果など） */
function CollectionBrowseRow({ collection, thumbnailUrl, href }: CollectionBrowseRowProps) {
  const gradientStyle = getCollectionGradientStyle(collection.gradient, collection.color);
  const meta = formatCollectionBrowseMeta(collection);

  return (
    <Link
      href={href}
      prefetch={false}
      className="flex w-full items-center gap-3 bg-white px-5 py-3.5 text-left text-[#191919] transition-colors hover:bg-gray-50 active:bg-gray-50"
    >
      <span className="h-12 w-12 shrink-0 overflow-hidden rounded-full bg-[#EBEBEB] ring-1 ring-black/[0.06]">
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt=""
            className="h-full w-full object-cover"
            width={48}
            height={48}
            decoding="async"
          />
        ) : (
          <span className="block h-full w-full" style={gradientStyle} aria-hidden />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-bold leading-snug">{collection.name}</span>
        <span className="mt-0.5 block truncate text-xs text-[#8A8A8A]">{meta}</span>
      </span>
    </Link>
  );
}

export default memo(CollectionBrowseRow);
