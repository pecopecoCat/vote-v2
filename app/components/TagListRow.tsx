"use client";

import Link from "next/link";
import type { TagMenuVariant } from "./TagMenuModal";

function EllipsisIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
    </svg>
  );
}

export interface TagListRowProps {
  tag: string;
  count: number;
  variant: TagMenuVariant;
  onMenuClick?: (tag: string, variant: TagMenuVariant) => void;
}

/** 検索：注目タグ / お気に入りタグの1行 */
export default function TagListRow({ tag, count, variant, onMenuClick }: TagListRowProps) {
  return (
    <Link
      href={`/search?tag=${encodeURIComponent(tag)}`}
      prefetch={false}
      className="flex items-center gap-2 border-b border-gray-100 py-3 last:border-b-0"
    >
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-gray-900">{tag}</p>
        <p className="text-xs text-gray-500">登録数 {count}件</p>
      </div>
      <button
        type="button"
        className="shrink-0 p-1 text-[#191919] hover:opacity-75"
        aria-label="メニュー"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onMenuClick?.(tag, variant);
        }}
      >
        <EllipsisIcon className="h-5 w-5" />
      </button>
    </Link>
  );
}
