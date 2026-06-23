"use client";

import Link from "next/link";
import { memo } from "react";
import type { Collection } from "../data/collections";
import {
  COLLECTION_VISIBILITY_LABEL,
  type CollectionCategory,
} from "../data/collectionCategories";
import { getCollectionGradientStyle } from "../data/search";

export type CollectionListTileProps = {
  collection: Collection;
  thumbnailUrl?: string | null;
  isPinned?: boolean;
  canPin?: boolean;
  showMenu?: boolean;
  onPinToggle?: () => void;
  onMenuClick?: () => void;
  href: string;
};

function CollectionListTile({
  collection,
  thumbnailUrl,
  isPinned = false,
  canPin = false,
  showMenu = false,
  onPinToggle,
  onMenuClick,
  href,
}: CollectionListTileProps) {
  const gradientStyle = getCollectionGradientStyle(collection.gradient, collection.color);
  const meta = `登録数 ${collection.cardIds.length}件 · ${COLLECTION_VISIBILITY_LABEL[collection.visibility]}`;

  return (
    <article className="collection-list-tile relative shrink-0">
      <Link href={href} prefetch={false} className="block rounded-[14px] bg-white shadow-[0_2px_12px_rgba(0,0,0,0.08)]">
        <div className="relative px-3 pb-3 pt-3">
          <div className="mb-3 flex items-start justify-between gap-1">
            {canPin ? (
              <button
                type="button"
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors ${
                  isPinned ? "bg-[#FFE100]" : "bg-[#EBEBEB]"
                }`}
                aria-label={isPinned ? "ピン留めを解除" : "ピン留めする"}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onPinToggle?.();
                }}
              >
                <img
                  src="/icons/icon_pin.svg"
                  alt=""
                  className={`h-[18px] w-[18px] ${isPinned ? "" : "opacity-35"}`}
                  width={18}
                  height={18}
                  aria-hidden
                />
              </button>
            ) : (
              <span className="h-8 w-8 shrink-0" aria-hidden />
            )}
            {showMenu ? (
              <button
                type="button"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#666666]"
                aria-label="コレクションのメニュー"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onMenuClick?.();
                }}
              >
                <img src="/icons/icon_3ten.svg" alt="" className="h-5 w-5" width={20} height={20} aria-hidden />
              </button>
            ) : (
              <span className="h-8 w-8 shrink-0" aria-hidden />
            )}
          </div>

          <div className="flex justify-center">
            <span className="relative h-[88px] w-[88px] overflow-hidden rounded-full ring-1 ring-black/[0.06]">
              {thumbnailUrl ? (
                <img
                  src={thumbnailUrl}
                  alt=""
                  className="h-full w-full object-cover"
                  width={88}
                  height={88}
                  decoding="async"
                />
              ) : (
                <span className="block h-full w-full" style={gradientStyle} aria-hidden />
              )}
            </span>
          </div>

          <h3 className="mt-3 line-clamp-2 text-center text-sm font-bold leading-snug text-[#191919]">
            {collection.name}
          </h3>
          <p className="mt-1 text-center text-[11px] leading-snug text-[#8A8A8A]">{meta}</p>
        </div>
      </Link>
    </article>
  );
}

export default memo(CollectionListTile);
