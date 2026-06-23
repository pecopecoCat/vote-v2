"use client";

import UnderlineTabBar, { type UnderlineTabItem } from "./UnderlineTabBar";

export type FeedTabId = "trending" | "new" | "community";

export interface FeedTabsProps {
  activeId: FeedTabId;
  onSelect: (id: FeedTabId) => void;
}

/** 375px 基準の余白。下は 0 にして黄線と nav の border-b（グレー）を同じ高さに揃える */
const feedTabNavStyle = {
  paddingLeft: "calc(100vw * 30 / 375)",
  paddingRight: "calc(100vw * 30 / 375)",
  paddingTop: "calc(100vw * 20 / 375)",
  paddingBottom: 0,
} as const;

const FEED_TAB_ITEMS: UnderlineTabItem<FeedTabId>[] = [
  { id: "trending", label: "急上昇中" },
  { id: "new", label: "新着" },
  { id: "community", label: "コミュニティ" },
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
        navStyle={feedTabNavStyle}
      />
    </div>
  );
}
