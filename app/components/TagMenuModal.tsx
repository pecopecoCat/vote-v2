"use client";

import { addHiddenTag } from "../data/hiddenTags";
import { addFavoriteTag, removeFavoriteTag } from "../data/favoriteTags";

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
      subLabel: "VOTEに表示しない",
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
    <>
      <div
        className="fixed inset-0 z-40 bg-black/50"
        aria-hidden
        onClick={onClose}
      />
      <div className="fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-hidden rounded-t-[30px] bg-white shadow-lg">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center border-b border-gray-100 px-5 py-3">
          <div />
          <span className="text-lg font-bold text-gray-900">メニュー</span>
          <div className="flex justify-end">
            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center text-blue-600"
              aria-label="閉じる"
              onClick={onClose}
            >
              <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
              </svg>
            </button>
          </div>
        </div>
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
                  <span className="flex flex-col items-start text-sm font-medium">
                    <span>{item.label}</span>
                    {item.subLabel != null && (
                      <span className="text-xs font-normal text-gray-500">{item.subLabel}</span>
                    )}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
}
