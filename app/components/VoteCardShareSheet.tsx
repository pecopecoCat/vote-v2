"use client";

import { useMemo } from "react";
import ShareSheet, { useSharePageUrl } from "./ShareSheet";

export interface VoteCardShareSheetProps {
  open: boolean;
  onClose: () => void;
  cardId: string;
}

export default function VoteCardShareSheet({ open, onClose, cardId }: VoteCardShareSheetProps) {
  const pageUrl = useSharePageUrl(useMemo(() => `/comments/${encodeURIComponent(cardId)}`, [cardId]));

  return <ShareSheet open={open} onClose={onClose} pageUrl={pageUrl} variant="vote-card" />;
}
