"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import BottomNav from "../components/BottomNav";
import NotificationTabs, { type NotificationTabId } from "../components/NotificationTabs";
import {
  ACTIVITY_TYPE_LABELS,
  MOCK_ANNOUNCEMENTS,
  type ActivityItem,
} from "../data/notifications";
import { getAuth, getAuthUpdatedEventName } from "../data/auth";
import { getCreatedVotes } from "../data/createdVotes";
import { getAllActivity } from "../data/voteCardActivity";
import { voteCardsData } from "../data/voteCards";

const MY_COMMENT_USER_NAME = "自分";

/** ユーザーのアクティビティを実データから組み立て（作成・投票・コメント）。日付降順。 */
function buildUserActivityItems(): ActivityItem[] {
  if (typeof window === "undefined") return [];
  const created = getCreatedVotes();
  const activity = getAllActivity();

  const getQuestion = (cardId: string): string => {
    const fromCreated = created.find((c) => (c.id ?? c.question) === cardId);
    if (fromCreated) return fromCreated.question;
    const m = /^seed-(\d+)$/.exec(cardId);
    if (m) {
      const idx = parseInt(m[1], 10);
      return voteCardsData[idx]?.question ?? "";
    }
    return "";
  };

  const formatDate = (iso: string) => {
    if (!iso) return "";
    try {
      const d = new Date(iso);
      return d.toLocaleDateString("ja-JP", { year: "numeric", month: "numeric", day: "numeric" });
    } catch {
      return iso;
    }
  };

  const items: ActivityItem[] = [];

  // 2択を作成した
  created.forEach((c) => {
    const cardId = c.id ?? c.question;
    items.push({
      type: "created",
      cardId,
      label: ACTIVITY_TYPE_LABELS.created,
      date: c.createdAt ? formatDate(c.createdAt) : "",
      questionPreview: c.question,
    });
  });

  // 投票した
  Object.entries(activity).forEach(([cardId, a]) => {
    if (!a.userSelectedOption) return;
    items.push({
      type: "voted",
      cardId,
      label: ACTIVITY_TYPE_LABELS.voted,
      date: "",
      questionPreview: getQuestion(cardId) || undefined,
    });
  });

  // コメントした（自分がコメントしたカード・最新コメントの日付で1件）
  Object.entries(activity).forEach(([cardId, a]) => {
    if (!Array.isArray(a.comments)) return;
    const myComments = a.comments.filter((c) => c.user?.name === MY_COMMENT_USER_NAME);
    if (myComments.length === 0) return;
    const latest = myComments[myComments.length - 1];
    items.push({
      type: "commented",
      cardId,
      label: ACTIVITY_TYPE_LABELS.commented,
      date: latest.date ? formatDate(latest.date) : "",
      questionPreview: getQuestion(cardId) || undefined,
    });
  });

  // 日付ありを先に、同じなら作成 > コメント > 投票の順
  items.sort((a, b) => {
    if (a.date && b.date) return b.date.localeCompare(a.date);
    if (a.date) return -1;
    if (b.date) return 1;
    const order = { created: 0, commented: 1, voted: 2 };
    return (order[a.type as keyof typeof order] ?? 3) - (order[b.type as keyof typeof order] ?? 3);
  });

  return items;
}

export default function NotificationsPage() {
  const [activeTab, setActiveTab] = useState<NotificationTabId>("activity");
  const [activityItems, setActivityItems] = useState<ActivityItem[]>([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    setIsLoggedIn(getAuth().isLoggedIn);
    setActivityItems(buildUserActivityItems());
    const handler = () => {
      setIsLoggedIn(getAuth().isLoggedIn);
      setActivityItems(buildUserActivityItems());
    };
    window.addEventListener(getAuthUpdatedEventName(), handler);
    return () => window.removeEventListener(getAuthUpdatedEventName(), handler);
  }, []);

  useEffect(() => {
    setActivityItems(buildUserActivityItems());
  }, [activeTab]);

  return (
    <div className="min-h-screen pb-[50px]">
      <NotificationTabs
        isLoggedIn={isLoggedIn}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        headerLabel="news-VOTEからのお知らせ"
        activityContent={<ActivityList items={activityItems} />}
        announcementsContent={<AnnouncementsList items={MOCK_ANNOUNCEMENTS} />}
      />
      <BottomNav activeId="notifications" />
    </div>
  );
}

function ActivityList({ items }: { items: ActivityItem[] }) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl bg-white px-6 py-12 text-center shadow-[0_2px_1px_0_rgba(51,51,51,0.08)]">
        <p className="text-sm text-gray-500">アクティビティはまだありません</p>
      </div>
    );
  }
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
              {item.date && <p className="mt-0.5 text-xs text-gray-500">{item.date}</p>}
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
