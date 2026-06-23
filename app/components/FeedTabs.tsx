"use client";

import UnderlineTabBar, { type UnderlineTabItem } from "./UnderlineTabBar";

export type FeedTabId = "trending" | "new";

export interface FeedTabsProps {
  activeId: FeedTabId;
  onSelect: (id: FeedTabId) => void;
}

const FEED_TAB_ITEMS: UnderlineTabItem<FeedTabId>[] = [
  { id: "trending", label: "急上昇中" },
  { id: "new", label: "新着" },
];

export default function FeedTabs({ activeId, onSelect }: FeedTabsProps) {
  return (
    <div className="sticky top-[64px] z-30 w-full min-w-0">
      <UnderlineTabBar
        items={FEED_TAB_ITEMS}
        activeId={activeId}
        onSelect={onSelect}
        ariaLabel="フィード切り替え"
        layout="center"
        backgroundClassName="bg-[#F1F1F1]"
      />
    </div>
  );
}
