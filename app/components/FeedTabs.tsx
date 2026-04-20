"use client";

export type FeedTabId = "trending" | "new" | "myTimeline";

export interface FeedTabsProps {
  activeId: FeedTabId;
  onSelect: (id: FeedTabId) => void;
  isLoggedIn?: boolean;
}

/** メニューテキスト〜黄色インジケーター上端の余白（線 3px と合わせてバランス） */
const feedTabButtonPb = "pb-[8px]";

/** 375px 基準の余白。`100vw` はデスクトップで画面全体になるため上限を付け、狭い PC カラムでもタブが潰れないようにする */
const feedTabNavStyle = {
  paddingLeft: "min(1.5rem, calc(100vw * 30 / 375))",
  paddingRight: "min(1.5rem, calc(100vw * 30 / 375))",
  paddingTop: "min(1.25rem, calc(100vw * 20 / 375))",
  paddingBottom: 0,
} as const;

export default function FeedTabs({
  activeId,
  onSelect,
  isLoggedIn = false,
}: FeedTabsProps) {
  return (
    <div className="sticky top-[64px] z-30 w-full min-w-0">
      <nav
        className="feed-tab-label flex w-full flex-nowrap justify-center gap-4 border-b border-gray-200 bg-[#F1F1F1] sm:gap-6"
        style={feedTabNavStyle}
        aria-label="フィード切り替え"
      >
      <button
        type="button"
        onClick={() => onSelect("trending")}
        className={`relative flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap ${feedTabButtonPb} text-[15px] leading-snug transition-colors ${
          activeId === "trending"
            ? "font-bold text-[var(--color-brand-logo)]"
            : "font-normal text-[var(--color-text-gray)]"
        }`}
        aria-current={activeId === "trending" ? "page" : undefined}
      >
        <span
          className={`feed-tab-fire-icon ${activeId === "trending" ? "feed-tab-fire-icon-active" : ""}`}
          aria-hidden
        />
        急上昇中
        {activeId === "trending" && (
          <span
            className="absolute bottom-0 left-0 right-0 h-[3px] rounded-full bg-[#FFE100]"
            aria-hidden
          />
        )}
      </button>

      <button
        type="button"
        onClick={() => onSelect("new")}
        className={`relative flex shrink-0 items-center justify-center whitespace-nowrap ${feedTabButtonPb} text-[15px] leading-snug transition-colors ${
          activeId === "new"
            ? "font-bold text-[var(--color-brand-logo)]"
            : "font-normal text-[var(--color-text-gray)]"
        }`}
        aria-current={activeId === "new" ? "page" : undefined}
      >
        新着
        {activeId === "new" && (
          <span
            className="absolute bottom-0 left-0 right-0 h-[3px] rounded-full bg-[#FFE100]"
            aria-hidden
          />
        )}
      </button>

      {isLoggedIn && (
        <button
          type="button"
          onClick={() => onSelect("myTimeline")}
          className={`relative flex shrink-0 items-center justify-center whitespace-nowrap ${feedTabButtonPb} text-[15px] leading-snug transition-colors ${
            activeId === "myTimeline"
              ? "font-bold text-[var(--color-brand-logo)]"
              : "font-normal text-[var(--color-text-gray)]"
          }`}
          aria-current={activeId === "myTimeline" ? "page" : undefined}
        >
          myTimeline
          {activeId === "myTimeline" && (
            <span
              className="absolute bottom-0 left-0 right-0 h-[3px] rounded-full bg-[#FFE100]"
              aria-hidden
            />
          )}
        </button>
      )}
    </nav>
    </div>
  );
}

