"use client";

import AppHeader from "./AppHeader";

export type NotificationTabId = "activity" | "announcements";

export interface NotificationTabsProps {
  /** SNSログイン時のみアクティビティタブを表示。未ログインは運営お知らせのみ */
  isLoggedIn: boolean;
  activeTab: NotificationTabId;
  onTabChange: (tab: NotificationTabId) => void;
  /** アクティビティタブの内容（isLoggedIn 時のみ表示） */
  activityContent: React.ReactNode;
  /** 運営からのお知らせタブの内容 */
  announcementsContent: React.ReactNode;
  /** ヘッダー上のラベル（旧デザイン用・現在は非表示） */
  headerLabel?: string;
}

/**
 * お知らせ画面用の共通TAB切り替えパーツ。ヘッダーは AppHeader「お知らせ」で統一。
 */
export default function NotificationTabs({
  isLoggedIn,
  activeTab,
  onTabChange,
  activityContent,
  announcementsContent,
}: NotificationTabsProps) {
  const effectiveTab = isLoggedIn ? activeTab : "announcements";

  return (
    <div className="bg-[#F1F1F1]">
      <AppHeader type="title" title="お知らせ" backHref="/" />

      {/* タブバー：上マージン120%(12px→14.4px)、下マージン95%(12px→11.4px)。黄ラインは境界に */}
      {isLoggedIn && (
        <nav className="flex bg-white" aria-label="お知らせタブ">
          <button
            type="button"
            onClick={() => onTabChange("activity")}
            className={`flex flex-1 flex-col pt-[14.4px] pb-[11.4px] text-sm font-bold ${
              effectiveTab === "activity" ? "text-gray-900" : "text-gray-500"
            }`}
          >
            <span className="flex-1" aria-hidden />
            <span className="relative inline-block">
              アクティビティ
              {effectiveTab === "activity" && (
                <span
                  className="absolute -bottom-[11.4px] left-0 right-0 h-[3px] w-full bg-[#FFE100]"
                  aria-hidden
                />
              )}
            </span>
          </button>
          <button
            type="button"
            onClick={() => onTabChange("announcements")}
            className={`flex flex-1 flex-col pt-[14.4px] pb-[11.4px] text-sm font-bold ${
              effectiveTab === "announcements" ? "text-gray-900" : "text-gray-500"
            }`}
          >
            <span className="flex-1" aria-hidden />
            <span className="relative inline-block">
              運営からのお知らせ
              {effectiveTab === "announcements" && (
                <span
                  className="absolute -bottom-[11.4px] left-0 right-0 h-[3px] w-full bg-[#FFE100]"
                  aria-hidden
                />
              )}
            </span>
          </button>
        </nav>
      )}

      {/* コンテンツ（グレー上のpadding 150%: 16px→24px） */}
      <main className="mx-auto max-w-lg px-[5.333vw] pb-4 pt-6">
        {effectiveTab === "activity" ? activityContent : announcementsContent}
      </main>
    </div>
  );
}
