"use client";

import UnderlineTabBar, { type UnderlineTabItem } from "./UnderlineTabBar";

export type FeedTabId = "trending" | "new" | "myTimeline";

export interface FeedTabsProps {
  activeId: FeedTabId;
  onSelect: (id: FeedTabId) => void;
  isLoggedIn?: boolean;
}

/** 375px 基準の余白。下は 0 にして黄線と nav の border-b（グレー）を同じ高さに揃える */
const feedTabNavStyle = {
  paddingLeft: "calc(100vw * 30 / 375)",
  paddingRight: "calc(100vw * 30 / 375)",
  paddingTop: "calc(100vw * 20 / 375)",
  paddingBottom: 0,
} as const;

const FEED_TAB_ITEMS: UnderlineTabItem<FeedTabId>[] = [
  {
    id: "trending",
    label: "急上昇中",
    icon: { type: "mask", src: "/icons/fire.svg", width: 16, height: 16 },
  },
  { id: "new", label: "新着" },
  { id: "myTimeline", label: "myTimeline" },
];

export default function FeedTabs({
  activeId,
  onSelect,
  isLoggedIn = false,
}: FeedTabsProps) {
  const items = isLoggedIn ? FEED_TAB_ITEMS : FEED_TAB_ITEMS.filter((t) => t.id !== "myTimeline");

  return (
    <div className="sticky top-[64px] z-30 w-full min-w-0">
      <UnderlineTabBar
        items={items}
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
