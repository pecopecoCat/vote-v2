"use client";

import { addHiddenTag } from "../data/hiddenTags";
import { addFavoriteTag, removeFavoriteTag } from "../data/favoriteTags";
import BottomSheet from "./BottomSheet";

/** 注目タグ用：興味がない・お気に入りに追加 / お気に入りタグ用：お気に入り解除 */
export type TagMenuVariant = "trending" | "favorite";

export interface TagMenuModalProps {
  tag: string | null;
  variant: TagMenuVariant;
  onClose: () => void;
  onHiddenTagsUpdated?: () => void;
  onFavoriteTagsUpdated?: () => void;
}

export default function TagMenuModal({
  tag,
  variant,
  onClose,
  onHiddenTagsUpdated,
  onFavoriteTagsUpdated,
}: TagMenuModalProps) {
  if (tag == null) return null;

  const handleNotInterested = () => {
    addHiddenTag(tag);
    onHiddenTagsUpdated?.();
    onClose();
  };

  const handleAddFavorite = () => {
    addFavoriteTag(tag);
    onFavoriteTagsUpdated?.();
    onClose();
  };

  const handleRemoveFavorite = () => {
    removeFavoriteTag(tag);
    onFavoriteTagsUpdated?.();
    onClose();
  };

  const trendingItems: { label: string; subLabel?: string; icon: string; onClick: () => void }[] = [
    {
      label: "興味がない",
      icon: "/icons/icon_dislike.svg",
      onClick: handleNotInterested,
    },
    {
      label: "お気に入りに追加",
      icon: "/icons/icon_heart.svg",
      onClick: handleAddFavorite,
    },
  ];

  const favoriteItems: { label: string; subLabel?: string; icon: string; onClick: () => void }[] = [
    {
      label: "お気に入り解除",
      subLabel: "解除する",
      icon: "/icons/icon_not_favorite.svg",
      onClick: handleRemoveFavorite,
    },
  ];

  const items = variant === "trending" ? trendingItems : favoriteItems;

  return (
    <BottomSheet open title="メニュー" onClose={onClose}>
      <div className="px-5 py-2">
        <ul className="divide-y divide-gray-100">
          {items.map((item) => (
            <li key={item.label}>
              <button
                type="button"
                className="flex w-full items-center gap-3 py-4 text-left text-gray-900 transition-colors hover:bg-gray-50"
                onClick={item.onClick}
              >
                <img
                  src={item.icon}
                  alt=""
                  className="h-5 w-5 shrink-0"
                  width={22}
                  height={22}
                />
                <span className="flex flex-col items-start text-sm">
                  <span>{item.label}</span>
                  {item.subLabel != null && (
                    <span className="text-xs font-bold text-gray-500">{item.subLabel}</span>
                  )}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </BottomSheet>
  );
}
