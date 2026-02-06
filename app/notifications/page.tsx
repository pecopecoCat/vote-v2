"use client";

import { useState } from "react";
import Link from "next/link";
import BottomNav from "../components/BottomNav";
import NotificationTabs, { type NotificationTabId } from "../components/NotificationTabs";
import {
  MOCK_ACTIVITIES,
  MOCK_ANNOUNCEMENTS,
  type ActivityItem,
} from "../data/notifications";

/** デモ用：SNSログインしているか（true=アクティビティタブ表示、false=運営お知らせのみ） */
const IS_SNS_LOGGED_IN = true;

export default function NotificationsPage() {
  const [activeTab, setActiveTab] = useState<NotificationTabId>("activity");

  return (
    <div className="min-h-screen pb-20">
      <NotificationTabs
        isLoggedIn={IS_SNS_LOGGED_IN}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        headerLabel="news-VOTEからのお知らせ"
        activityContent={<ActivityList items={MOCK_ACTIVITIES} />}
        announcementsContent={<AnnouncementsList items={MOCK_ANNOUNCEMENTS} />}
      />
      <BottomNav activeId="notifications" />
    </div>
  );
}

function ActivityList({ items }: { items: ActivityItem[] }) {
  return (
    <ul className="divide-y divide-gray-200 rounded-xl bg-white shadow-[0_2px_1px_0_rgba(51,51,51,0.08)]">
      {items.map((item, i) => (
        <li key={`${item.cardId}-${item.type}-${i}`}>
          <Link
            href={`/comments/${item.cardId}`}
            className="flex gap-3 px-4 py-4 transition-colors hover:bg-gray-50"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-900 text-white">
              <CheckIcon className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1 text-left">
              <p className="text-sm font-medium text-gray-900">{item.label}</p>
              <p className="mt-0.5 text-xs text-gray-500">{item.date}</p>
              {item.questionPreview && (
                <div className="mt-2 rounded-lg bg-gray-100 px-3 py-2">
                  <p className="text-xs text-gray-700">{item.questionPreview}</p>
                </div>
              )}
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function AnnouncementsList({
  items,
}: {
  items: { title: string; body: string; date: string }[];
}) {
  return (
    <ul className="space-y-3">
      {items.map((item, i) => (
        <li
          key={i}
          className="rounded-xl bg-white p-4 shadow-[0_2px_1px_0_rgba(51,51,51,0.08)]"
        >
          <h3 className="text-sm font-bold text-gray-900">{item.title}</h3>
          <p className="mt-2 text-xs leading-relaxed text-gray-700">{item.body}</p>
          <p className="mt-2 text-xs text-gray-500">{item.date}</p>
        </li>
      ))}
    </ul>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
    </svg>
  );
}
