"use client";

export type FeedTabId = "trending" | "new" | "myTimeline";

export interface FeedTabsProps {
  activeId: FeedTabId;
  onSelect: (id: FeedTabId) => void;
  isLoggedIn?: boolean;
}

export default function FeedTabs({
  activeId,
  onSelect,
  isLoggedIn = false,
}: FeedTabsProps) {
  return (
    <div className="sticky top-[64px] z-30 w-full min-w-0">
      <nav
        className="feed-tab-label flex w-full justify-center gap-6 border-b border-gray-200 bg-[#F1F1F1] px-[5.333vw] pt-[14.4px] pb-0"
        aria-label="フィード切り替え"
      >
      <button
        type="button"
        onClick={() => onSelect("trending")}
        className={`relative flex items-center justify-center gap-1.5 pb-[14.4px] text-sm transition-colors ${
          activeId === "trending" ? "text-[var(--color-brand-logo)]" : "text-[var(--color-text-gray)]"
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
            className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#FFE100]"
            aria-hidden
          />
        )}
      </button>

      <button
        type="button"
        onClick={() => onSelect("new")}
        className={`relative flex items-center justify-center pb-[14.4px] text-sm transition-colors ${
          activeId === "new" ? "text-[var(--color-brand-logo)]" : "text-[var(--color-text-gray)]"
        }`}
        aria-current={activeId === "new" ? "page" : undefined}
      >
        新着
        {activeId === "new" && (
          <span
            className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#FFE100]"
            aria-hidden
          />
        )}
      </button>

      {isLoggedIn && (
        <button
          type="button"
          onClick={() => onSelect("myTimeline")}
          className={`relative flex items-center justify-center pb-[14.4px] text-sm transition-colors ${
            activeId === "myTimeline" ? "text-[var(--color-brand-logo)]" : "text-[var(--color-text-gray)]"
          }`}
          aria-current={activeId === "myTimeline" ? "page" : undefined}
        >
          myTimeline
          {activeId === "myTimeline" && (
            <span
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#FFE100]"
              aria-hidden
            />
          )}
        </button>
      )}
    </nav>
    </div>
  );
}

