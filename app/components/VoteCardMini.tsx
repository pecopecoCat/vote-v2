"use client";

import VoteCardCompact from "./VoteCardCompact";
import type { VoteCardCompactProps } from "./VoteCardCompact";

/**
 * 個別ページ一番上の VOTE CARD mini。下のコンテンツと同じ横幅で表示。
 */
export type VoteCardMiniProps = VoteCardCompactProps;

export default function VoteCardMini(props: VoteCardMiniProps) {
  return <VoteCardCompact {...props} variant="mini" hideTags />;
}
