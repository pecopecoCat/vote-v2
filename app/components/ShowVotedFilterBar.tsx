"use client";

import Checkbox from "./Checkbox";
import NewestOldestSortDropdown, { type NewestOldestSortOrder } from "./NewestOldestSortDropdown";

export interface ShowVotedFilterBarProps {
  sortOrder: NewestOldestSortOrder;
  onSortOrderChange: (order: NewestOldestSortOrder) => void;
  showVoted: boolean;
  onShowVotedChange: (value: boolean) => void;
  className?: string;
}

/** 新着順 + 「投票済みを表示」（検索タグ一覧・コレクション詳細で共通） */
export default function ShowVotedFilterBar({
  sortOrder,
  onSortOrderChange,
  showVoted,
  onShowVotedChange,
  className = "",
}: ShowVotedFilterBarProps) {
  return (
    <div
      className={[
        "flex items-center justify-between gap-2 border-b border-gray-200",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="relative z-30 min-w-0 shrink-0">
        <NewestOldestSortDropdown value={sortOrder} onChange={onSortOrderChange} />
      </div>
      <Checkbox checked={showVoted} onChange={onShowVotedChange} label="投票済みを表示" />
    </div>
  );
}
