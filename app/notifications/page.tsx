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
import {
  getAllActivity,
  getVoteEvents,
  type VoteComment,
} from "../data/voteCardActivity";
import { getBookmarkEvents } from "../data/bookmarks";
import { voteCardsData } from "../data/voteCards";

const MY_COMMENT_USER_NAME = "自分";

function getQuestion(cardId: string, created: { id?: string; question: string }[]): string {
  const fromCreated = created.find((c) => (c.id ?? c.question) === cardId);
  if (fromCreated) return fromCreated.question;
  const m = /^seed-(\d+)$/.exec(cardId);
  if (m) {
    const idx = parseInt(m[1], 10);
    return voteCardsData[idx]?.question ?? "";
  }
  return "";
}

function formatDate(iso: string): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("ja-JP", { year: "numeric", month: "numeric", day: "numeric" });
  } catch {
    return iso;
  }
}

function isMyComment(c: VoteComment, currentUserName: string | undefined): boolean {
  return c.user?.name === MY_COMMENT_USER_NAME || c.user?.name === currentUserName;
}

/** ユーザーのアクティビティを実データから組み立て。日付降順。 */
function buildUserActivityItems(): ActivityItem[] {
  if (typeof window === "undefined") return [];
  const auth = getAuth();
  const currentUserName = auth.user?.name;
  const created = getCreatedVotes();
  const activity = getAllActivity();
  const voteEvents = getVoteEvents();
  const bookmarkEvents = getBookmarkEvents();
  const myCreatedCardIds = new Set(created.map((c) => c.id ?? c.question));

  const items: ActivityItem[] = [];

  // 自分が投票した
  Object.entries(activity).forEach(([cardId, a]) => {
    if (!a.userSelectedOption) return;
    items.push({
      type: "voted",
      cardId,
      label: ACTIVITY_TYPE_LABELS.voted,
      date: "",
      questionPreview: getQuestion(cardId, created) || undefined,
    });
  });

  // 自分がコメントした（最新コメントの日付で1件）
  Object.entries(activity).forEach(([cardId, a]) => {
    if (!Array.isArray(a.comments)) return;
    const myComments = a.comments.filter((c) => isMyComment(c, currentUserName));
    if (myComments.length === 0) return;
    const latest = myComments[myComments.length - 1];
    items.push({
      type: "commented",
      cardId,
      label: ACTIVITY_TYPE_LABELS.commented,
      date: latest.date ? formatDate(latest.date) : "",
      questionPreview: getQuestion(cardId, created) || undefined,
    });
  });

  // 作成した2択に投票があった
  voteEvents.forEach((ev) => {
    if (!myCreatedCardIds.has(ev.cardId)) return;
    items.push({
      type: "voted_on_mine",
      cardId: ev.cardId,
      label: ACTIVITY_TYPE_LABELS.voted_on_mine,
      date: ev.date ? formatDate(ev.date) : "",
      questionPreview: getQuestion(ev.cardId, created) || undefined,
    });
  });

  // 作成した2択にコメントがあった（他人のコメントのみ・最新の日付で1件 per カード）
  Object.entries(activity).forEach(([cardId, a]) => {
    if (!myCreatedCardIds.has(cardId) || !Array.isArray(a.comments)) return;
    const others = a.comments.filter((c) => !isMyComment(c, currentUserName));
    if (others.length === 0) return;
    const latest = others[others.length - 1];
    items.push({
      type: "comment_on_mine",
      cardId,
      label: ACTIVITY_TYPE_LABELS.comment_on_mine,
      date: latest.date ? formatDate(latest.date) : "",
      questionPreview: getQuestion(cardId, created) || undefined,
    });
  });

  // 作成した2択がブックマークされた
  bookmarkEvents.forEach((ev) => {
    if (!myCreatedCardIds.has(ev.cardId)) return;
    items.push({
      type: "bookmark_on_mine",
      cardId: ev.cardId,
      label: ACTIVITY_TYPE_LABELS.bookmark_on_mine,
      date: ev.date ? formatDate(ev.date) : "",
      questionPreview: getQuestion(ev.cardId, created) || undefined,
    });
  });

  // 設定した投票期間が終わった
  const now = new Date().toISOString();
  created.forEach((c) => {
    const periodEnd = c.periodEnd;
    if (!periodEnd || periodEnd > now) return;
    const cardId = c.id ?? c.question;
    items.push({
      type: "period_ended",
      cardId,
      label: ACTIVITY_TYPE_LABELS.period_ended,
      date: formatDate(periodEnd),
      questionPreview: c.question,
    });
  });

  // 自分が送ったコメントにいいねがついた
  Object.entries(activity).forEach(([cardId, a]) => {
    if (!Array.isArray(a.comments)) return;
    a.comments.forEach((c) => {
      if (!isMyComment(c, currentUserName)) return;
      const likes = c.likeCount ?? 0;
      if (likes <= 0) return;
      items.push({
        type: "liked_my_comment",
        cardId,
        label: ACTIVITY_TYPE_LABELS.liked_my_comment,
        date: c.date ? formatDate(c.date) : "",
        questionPreview: getQuestion(cardId, created) || undefined,
      });
    });
  });

  // 日付降順（ISO で比較し、日付なしは後ろ）
  items.sort((a, b) => {
    const dateA = a.date ? new Date(a.date).toISOString() : "";
    const dateB = b.date ? new Date(b.date).toISOString() : "";
    if (dateA && dateB) return dateB.localeCompare(dateA);
    if (dateA) return -1;
    if (dateB) return 1;
    const order: Record<string, number> = {
      created: 0,
      commented: 1,
      voted: 2,
      voted_on_mine: 3,
      comment_on_mine: 4,
      bookmark_on_mine: 5,
      period_ended: 6,
      liked_my_comment: 7,
    };
    return (order[a.type] ?? 8) - (order[b.type] ?? 8);
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
