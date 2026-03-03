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
import { getAuth, getAuthUpdatedEventName, getCurrentActivityUserId } from "../data/auth";
import { getCreatedVotes } from "../data/createdVotes";
import {
  getAllActivity,
  getVoteEvents,
  type VoteComment,
  type CardActivity,
} from "../data/voteCardActivity";
import { getBookmarkEvents } from "../data/bookmarks";
import { voteCardsData } from "../data/voteCards";
import { useSharedData } from "../context/SharedDataContext";
import type { VoteEvent, BookmarkEvent } from "../context/SharedDataContext";
import type { VoteCardData } from "../data/voteCards";

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
function buildUserActivityItems(opts?: {
  created?: VoteCardData[];
  activity?: Record<string, CardActivity>;
  voteEvents?: VoteEvent[];
  bookmarkEvents?: BookmarkEvent[];
}): ActivityItem[] {
  if (typeof window === "undefined") return [];
  const auth = getAuth();
  const currentUserName = auth.user?.name;
  const created = opts?.created ?? getCreatedVotes();
  const activity = opts?.activity ?? getAllActivity();
  const voteEvents = opts?.voteEvents ?? getVoteEvents();
  const bookmarkEvents = opts?.bookmarkEvents ?? getBookmarkEvents();
  const myCreatedCardIds = new Set(created.map((c) => c.id ?? c.question));

  const items: ActivityItem[] = [];

  // 自分がしたこと（投票・コメント）は通知しない。自分の作成VOTE・自分のコメントへのアクションのみ表示

  // 作成した2択に投票があった
  voteEvents.forEach((ev) => {
    if (!myCreatedCardIds.has(ev.cardId)) return;
    items.push({
      type: "voted_on_mine",
      cardId: ev.cardId,
      label: ACTIVITY_TYPE_LABELS.voted_on_mine,
      date: ev.date ? formatDate(ev.date) : "",
      dateIso: ev.date ?? undefined,
      questionPreview: getQuestion(ev.cardId, created) || undefined,
      actorVote: ev.option,
    });
  });

  // 作成した2択にコメントがあった（他人のコメントのみ・最新の日付で1件 per カード）
  Object.entries(activity).forEach(([cardId, a]) => {
    if (!myCreatedCardIds.has(cardId) || !Array.isArray(a.comments)) return;
    const others = a.comments.filter((c) => !c.parentId && !isMyComment(c, currentUserName));
    if (others.length === 0) return;
    const latest = others[others.length - 1];
    items.push({
      type: "comment_on_mine",
      cardId,
      label: ACTIVITY_TYPE_LABELS.comment_on_mine,
      date: latest.date ? formatDate(latest.date) : "",
      dateIso: latest.date ?? undefined,
      questionPreview: getQuestion(cardId, created) || undefined,
      actorName: latest.user?.name,
      actorIconUrl: latest.user?.iconUrl,
      commentPreview: latest.text,
      // コメント保存時に記録したA/B。未記録の既存コメントは "A" を表示
      actorVote: latest.userVoteOption ?? "A",
    });
  });

  // あなたのコメントに返信があった（〇〇さんが、あなたのコメントにコメントしました）
  Object.entries(activity).forEach(([cardId, a]) => {
    if (!Array.isArray(a.comments)) return;
    const myCommentIds = new Set(
      a.comments.filter((c) => isMyComment(c, currentUserName)).map((c) => c.id)
    );
    if (myCommentIds.size === 0) return;
    a.comments
      .filter((c) => c.parentId && myCommentIds.has(c.parentId))
      .forEach((reply) => {
        items.push({
          type: "reply_to_my_comment",
          cardId,
          label: ACTIVITY_TYPE_LABELS.reply_to_my_comment,
          date: reply.date ? formatDate(reply.date) : "",
          dateIso: reply.date ?? undefined,
          questionPreview: getQuestion(cardId, created) || undefined,
          actorName: reply.user?.name,
          actorIconUrl: reply.user?.iconUrl,
          commentPreview: reply.text,
          actorVote: reply.userVoteOption ?? "A",
        });
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
      dateIso: ev.date ?? undefined,
      questionPreview: getQuestion(ev.cardId, created) || undefined,
    });
  });

  // 設定した投票期間が終わった（投票結果が決定しました！）
  const now = new Date().toISOString();
  created.forEach((c) => {
    const periodEnd = c.periodEnd;
    if (!periodEnd || periodEnd > now) return;
    const cardId = c.id ?? c.question;
    items.push({
      type: "period_ended",
      cardId,
      label: "投票結果が決定しました！",
      date: formatDate(periodEnd),
      dateIso: periodEnd,
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
        dateIso: c.date ?? undefined,
        questionPreview: getQuestion(cardId, created) || undefined,
        commentPreview: c.text,
      });
    });
  });

  // 最新順（dateIso で比較。日付なしは後ろ）
  items.sort((a, b) => {
    const dateA = a.dateIso ?? "";
    const dateB = b.dateIso ?? "";
    if (dateA && dateB) return dateB.localeCompare(dateA);
    if (dateA) return -1;
    if (dateB) return 1;
    const order: Record<string, number> = {
      created: 0,
      commented: 1,
      voted: 2,
      voted_on_mine: 3,
      comment_on_mine: 4,
      reply_to_my_comment: 5,
      bookmark_on_mine: 6,
      period_ended: 7,
      liked_my_comment: 8,
    };
    return (order[a.type] ?? 8) - (order[b.type] ?? 8);
  });

  return items;
}

export default function NotificationsPage() {
  const shared = useSharedData();
  const [activeTab, setActiveTab] = useState<NotificationTabId>("activity");
  const [activityItems, setActivityItems] = useState<ActivityItem[]>([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const refreshActivityItems = () => {
    if (shared.isRemote) {
      const userId = getCurrentActivityUserId();
      const myCreated = shared.createdVotesForTimeline.filter((c) => c.createdByUserId === userId);
      setActivityItems(
        buildUserActivityItems({
          created: myCreated,
          activity: shared.activity,
          voteEvents: shared.voteEvents,
          bookmarkEvents: shared.bookmarkEvents,
        })
      );
    } else {
      setActivityItems(buildUserActivityItems());
    }
  };

  useEffect(() => {
    setIsLoggedIn(getAuth().isLoggedIn);
    refreshActivityItems();
    const handler = () => {
      setIsLoggedIn(getAuth().isLoggedIn);
      refreshActivityItems();
    };
    window.addEventListener(getAuthUpdatedEventName(), handler);
    return () => window.removeEventListener(getAuthUpdatedEventName(), handler);
  }, []);

  useEffect(() => {
    refreshActivityItems();
  }, [activeTab, shared.isRemote, shared.createdVotesForTimeline, shared.activity, shared.voteEvents, shared.bookmarkEvents]);

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

function getActivityLabel(item: ActivityItem): string {
  if (item.actorName) {
    if (item.type === "comment_on_mine") return `${item.actorName}さんが、あなたのトピックにコメントしました`;
    if (item.type === "reply_to_my_comment") return `${item.actorName}さんが、あなたのコメントにコメントしました`;
  }
  return item.label;
}

/** アイコン左上に表示するA or Bバッジ（選択した回答）12px・白枠1px */
function ABBadge({ option }: { option: "A" | "B" }) {
  const isA = option === "A";
  return (
    <span
      className="absolute left-0 top-0 z-10 box-border flex items-center justify-center rounded-full border border-white text-[8px] font-bold leading-none text-white shadow-sm"
      style={{
        width: 12,
        height: 12,
        minWidth: 12,
        minHeight: 12,
        backgroundColor: isA ? "#E63E48" : "#3273E3",
      }}
      aria-hidden
    >
      {option}
    </span>
  );
}

const ICON_WHITE = { filter: "brightness(0) invert(1)" };

function ActivityIcon({ item }: { item: ActivityItem }) {
  const iconClass = "h-10 w-10 shrink-0 overflow-hidden rounded-full flex items-center justify-center";
  const actorVote = item.actorVote;

  switch (item.type) {
    case "voted_on_mine":
      return (
        <span className="relative h-10 w-10 shrink-0 overflow-visible">
          <span className={iconClass} style={{ backgroundColor: "#FFE100" }}>
            <img src="/icons/vote_icon_dark.svg" alt="" className="h-5 w-5" width={20} height={20} />
          </span>
          {actorVote === "A" || actorVote === "B" ? <ABBadge option={actorVote} /> : null}
        </span>
      );
    case "comment_on_mine":
    case "reply_to_my_comment":
      return (
        <span className="relative h-10 w-10 shrink-0 overflow-visible">
          <span className={`${iconClass} bg-gray-100`}>
            <img
              src={item.actorIconUrl ?? "/default-avatar.png"}
              alt=""
              className="h-full w-full object-cover"
            />
          </span>
          {actorVote === "A" || actorVote === "B" ? <ABBadge option={actorVote} /> : null}
        </span>
      );
    case "liked_my_comment":
      return (
        <span className={iconClass} style={{ backgroundColor: "#F08B8B" }}>
          <img src="/icons/good.svg" alt="" className="h-5 w-5" width={20} height={17} style={ICON_WHITE} />
        </span>
      );
    case "period_ended":
      return (
        <span className={iconClass} style={{ backgroundColor: "#98D4BB" }}>
          <img src="/icons/cal.svg" alt="" className="h-5 w-5" width={20} height={20} style={ICON_WHITE} />
        </span>
      );
    case "bookmark_on_mine":
      return (
        <span className={iconClass} style={{ backgroundColor: "#E67E22" }}>
          <img src="/icons/bookmark.svg" alt="" className="h-5 w-5" width={20} height={20} style={ICON_WHITE} />
        </span>
      );
    default:
      return (
        <span className={iconClass} style={{ backgroundColor: "#191919" }}>
          <CheckIcon className="h-5 w-5 text-white" />
        </span>
      );
  }
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
      {items.map((item, i) => {
        const preview = item.commentPreview ?? item.questionPreview;
        return (
          <li key={`${item.cardId}-${item.type}-${i}`}>
            <Link
              href={`/comments/${item.cardId}`}
              className="flex gap-3 px-4 py-4 transition-colors hover:bg-gray-50"
            >
              <ActivityIcon item={item} />
              <div className="min-w-0 flex-1 text-left">
                <p className="text-sm font-medium text-gray-900">{getActivityLabel(item)}</p>
                {item.date && <p className="mt-0.5 text-xs text-gray-500">{item.date}</p>}
                {preview && (
                  <div className="mt-2 rounded-lg bg-gray-100 px-3 py-2">
                    <p className="text-xs text-gray-700 line-clamp-2">{preview}</p>
                  </div>
                )}
              </div>
            </Link>
          </li>
        );
      })}
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
