import { NextResponse } from "next/server";
import { getKV } from "../../lib/kv";
import { readActivityGetPayload, readCreatedVotesList } from "../../lib/kvTimelineReads";

/**
 * 初回表示用：created-votes + activity を1回のHTTPで取得（KV 読み取りもまとめて実行）。
 */
export async function GET(request: Request): Promise<NextResponse<Record<string, unknown> | { error: string }>> {
  const kv = await getKV();
  if (!kv) {
    return NextResponse.json({ error: "KV_NOT_CONFIGURED" }, { status: 503 });
  }
  const userId = new URL(request.url).searchParams.get("userId") ?? "";
  try {
    const [createdVotes, activity] = await Promise.all([readCreatedVotesList(kv), readActivityGetPayload(kv, userId)]);
    return NextResponse.json({
      createdVotes,
      global: activity.global,
      userSelections: activity.userSelections,
      voteEvents: activity.voteEvents,
      bookmarkEvents: activity.bookmarkEvents,
      memberJoinEvents: activity.memberJoinEvents,
    });
  } catch (e) {
    console.error("[api/timeline-bootstrap] GET error:", e);
    return NextResponse.json({ error: "KV_ERROR" }, { status: 500 });
  }
}
