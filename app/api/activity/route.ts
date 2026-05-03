import { NextResponse } from "next/server";
import { getKV } from "../../lib/kv";
import type { MemberJoinOwnerEvent } from "../../lib/memberJoinOwnerNotifications";
import {
  readActivityGetPayload,
  KV_ACTIVITY_GLOBAL,
  KV_ACTIVITY_USER_PREFIX,
  KV_VOTE_EVENTS,
  KV_BOOKMARK_EVENTS,
  type GlobalCardData,
  type VoteEvent,
  type BookmarkEvent,
} from "../../lib/kvTimelineReads";

export type { GlobalCardData, VoteEvent, BookmarkEvent, MemberJoinOwnerEvent };

/** GET ?userId= → { global, userSelections, voteEvents, bookmarkEvents } */
export async function GET(request: Request): Promise<NextResponse<Record<string, unknown> | { error: string }>> {
  const kv = await getKV();
  if (!kv) {
    return NextResponse.json({ error: "KV_NOT_CONFIGURED" }, { status: 503 });
  }
  const userId = new URL(request.url).searchParams.get("userId") ?? "";
  try {
    const payload = await readActivityGetPayload(kv, userId);
    return NextResponse.json({
      global: payload.global,
      userSelections: payload.userSelections,
      voteEvents: payload.voteEvents,
      bookmarkEvents: payload.bookmarkEvents,
      memberJoinEvents: payload.memberJoinEvents,
    });
  } catch (e) {
    console.error("[api/activity] GET error:", e);
    return NextResponse.json({ error: "KV_ERROR" }, { status: 500 });
  }
}

type ActivityPostSync =
  | {
      type: "vote";
      cardId: string;
      card: GlobalCardData;
      userSelection: { userSelectedOption: "A" | "B"; votedAt: string };
      voteEvent: VoteEvent;
    }
  | {
      type: "comment";
      cardId: string;
      card: GlobalCardData;
    }
  | {
      type: "delete_comment";
      cardId: string;
      card: GlobalCardData;
    }
  | {
      type: "bookmark";
      bookmarkEvent: BookmarkEvent;
    };

/** POST body: vote | comment | delete_comment | bookmark — 成功時は sync で差分返却（全件GET削減） */
export async function POST(
  request: Request
): Promise<NextResponse<{ ok: boolean; sync?: ActivityPostSync } | { error: string }>> {
  const kv = await getKV();
  if (!kv) {
    return NextResponse.json({ error: "KV_NOT_CONFIGURED" }, { status: 503 });
  }
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const type = body?.type as string;

    if (type === "vote") {
      const userId = body.userId as string;
      const cardId = body.cardId as string;
      const option = body.option as "A" | "B";
      if (!userId || !cardId || (option !== "A" && option !== "B")) {
        return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
      }
      const global = (await kv.get<Record<string, GlobalCardData>>(KV_ACTIVITY_GLOBAL)) ?? {};
      const current = global[cardId] ?? { countA: 0, countB: 0, comments: [] };
      const nextGlobal = {
        ...global,
        [cardId]: {
          countA: current.countA + (option === "A" ? 1 : 0),
          countB: current.countB + (option === "B" ? 1 : 0),
          comments: current.comments ?? [],
        },
      };
      await kv.set(KV_ACTIVITY_GLOBAL, nextGlobal);
      const userKey = KV_ACTIVITY_USER_PREFIX + userId;
      const userData =
        (await kv.get<Record<string, { userSelectedOption?: "A" | "B"; votedAt?: string }>>(userKey)) ?? {};
      const votedAt = new Date().toISOString();
      await kv.set(userKey, { ...userData, [cardId]: { userSelectedOption: option, votedAt } });
      const events = (await kv.get<VoteEvent[]>(KV_VOTE_EVENTS)) ?? [];
      const voteEvent: VoteEvent = { cardId, date: votedAt, option };
      events.push(voteEvent);
      await kv.set(KV_VOTE_EVENTS, events.slice(-200));
      return NextResponse.json({
        ok: true,
        sync: {
          type: "vote" as const,
          cardId,
          card: nextGlobal[cardId],
          userSelection: { userSelectedOption: option, votedAt },
          voteEvent,
        },
      });
    }

    if (type === "comment") {
      const cardId = body.cardId as string;
      const comment = body.comment as { user?: { name: string; iconUrl?: string }; text?: string };
      const authorUserId = typeof body.userId === "string" && body.userId.length > 0 ? body.userId : undefined;
      const parentCommentId = body.parentCommentId as string | undefined;
      const commenterVoteOption = body.commenterVoteOption as "A" | "B" | undefined;
      const collectionId = typeof body.collectionId === "string" ? body.collectionId : undefined;
      if (!cardId || !comment?.user?.name || typeof comment.text !== "string") {
        return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
      }
      const global = (await kv.get<Record<string, GlobalCardData>>(KV_ACTIVITY_GLOBAL)) ?? {};
      const current = global[cardId] ?? { countA: 0, countB: 0, comments: [] };
      const comments = Array.isArray(current.comments) ? current.comments : [];
      let nextComments: GlobalCardData["comments"] = [
        ...comments,
        {
          id: `comment-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          ...(authorUserId ? { userId: authorUserId } : {}),
          user: comment.user,
          ...(collectionId && collectionId.length > 0 ? { collectionId } : {}),
          date: new Date().toISOString(),
          text: comment.text,
          likeCount: 0,
          parentId: parentCommentId,
          replyCount: 0,
          userVoteOption: commenterVoteOption === "A" || commenterVoteOption === "B" ? commenterVoteOption : undefined,
        },
      ];
      if (parentCommentId) {
        nextComments = nextComments.map((c) =>
          c.id === parentCommentId ? { ...c, replyCount: (c.replyCount ?? 0) + 1 } : c
        );
      }
      const nextCard: GlobalCardData = {
        countA: current.countA,
        countB: current.countB,
        comments: nextComments,
      };
      await kv.set(KV_ACTIVITY_GLOBAL, {
        ...global,
        [cardId]: nextCard,
      });
      return NextResponse.json({
        ok: true,
        sync: { type: "comment" as const, cardId, card: nextCard },
      });
    }

    if (type === "delete_comment") {
      const cardId = body.cardId as string;
      const commentId = body.commentId as string;
      const authorName = typeof body.authorName === "string" ? body.authorName.trim() : "";
      if (!cardId || !commentId || !authorName) {
        return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
      }
      const global = (await kv.get<Record<string, GlobalCardData>>(KV_ACTIVITY_GLOBAL)) ?? {};
      const current = global[cardId] ?? { countA: 0, countB: 0, comments: [] };
      const comments = Array.isArray(current.comments) ? current.comments : [];
      const target = comments.find((c) => c.id === commentId);
      if (!target || target.user?.name !== authorName) {
        return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
      }
      const idsToRemove = new Set<string>([commentId]);
      if (!target.parentId) {
        for (const c of comments) {
          if (c.parentId === commentId) idsToRemove.add(c.id);
        }
      }
      let nextComments = comments.filter((c) => !idsToRemove.has(c.id));
      if (target.parentId) {
        nextComments = nextComments.map((c) =>
          c.id === target.parentId ? { ...c, replyCount: Math.max(0, (c.replyCount ?? 0) - 1) } : c
        );
      }
      const nextCard: GlobalCardData = {
        countA: current.countA,
        countB: current.countB,
        comments: nextComments,
      };
      await kv.set(KV_ACTIVITY_GLOBAL, {
        ...global,
        [cardId]: nextCard,
      });
      return NextResponse.json({
        ok: true,
        sync: { type: "delete_comment" as const, cardId, card: nextCard },
      });
    }

    if (type === "bookmark") {
      const cardId = body.cardId as string;
      if (!cardId || typeof cardId !== "string") {
        return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
      }
      const events = (await kv.get<BookmarkEvent[]>(KV_BOOKMARK_EVENTS)) ?? [];
      const bookmarkEvent: BookmarkEvent = { cardId, date: new Date().toISOString() };
      events.push(bookmarkEvent);
      await kv.set(KV_BOOKMARK_EVENTS, events.slice(-200));
      return NextResponse.json({
        ok: true,
        sync: { type: "bookmark" as const, bookmarkEvent },
      });
    }

    return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
  } catch (e) {
    console.error("[api/activity] POST error:", e);
    return NextResponse.json({ error: "KV_ERROR" }, { status: 500 });
  }
}
