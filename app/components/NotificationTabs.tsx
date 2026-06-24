"use client";

import AppHeader from "./AppHeader";
import UnderlineTabBar, { type UnderlineTabItem } from "./UnderlineTabBar";

export type NotificationTabId = "activity" | "announcements";

const NOTIFICATION_TAB_ITEMS: UnderlineTabItem<NotificationTabId>[] = [
  { id: "activity", label: "アクティビティ" },
  { id: "announcements", label: "運営からのお知らせ" },
];

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
    <div className="min-w-0 overflow-visible bg-[#F1F1F1]">
      <AppHeader type="logo" />

      {isLoggedIn ? (
        <UnderlineTabBar
          items={NOTIFICATION_TAB_ITEMS}
          activeId={effectiveTab}
          onSelect={onTabChange}
          ariaLabel="お知らせタブ"
          layout="equalScroll"
        />
      ) : null}

      {/* 横余白は main で統一（アイコンが左で見切れないよう） */}
      <main className="mx-auto w-full min-w-0 max-w-lg px-[5.333vw] pb-6 pt-4 md:px-6">
        {effectiveTab === "activity" ? (
          activityContent
        ) : (
          <div className="notification-announcements-width">{announcementsContent}</div>
        )}
      </main>
    </div>
  );
}
