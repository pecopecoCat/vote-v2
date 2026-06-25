"use client";

import { useCallback, useState } from "react";
import { isCollectionVoteCardAddEnabled } from "../lib/collectionVoteCardMutation";

/** カードの「…」メニュー → 非表示 / 通報モーダル用の共通 state */
export function useCardModerationFlow() {
  const [cardOptionsCardId, setCardOptionsCardId] = useState<string | null>(null);
  const [cardOptionsIsOwnCard, setCardOptionsIsOwnCard] = useState(false);
  const [reportCardId, setReportCardId] = useState<string | null>(null);

  const [addToCommunityCardId, setAddToCommunityCardId] = useState<string | null>(null);

  const openCardOptions = useCallback((cardId: string, isOwnCard: boolean) => {
    setCardOptionsCardId(cardId);
    setCardOptionsIsOwnCard(isOwnCard);
  }, []);

  const closeCardOptions = useCallback(() => setCardOptionsCardId(null), []);

  const openAddToCommunity = useCallback((cardId: string) => {
    if (!isCollectionVoteCardAddEnabled()) return;
    setAddToCommunityCardId(cardId);
    setCardOptionsCardId(null);
  }, []);

  const closeAddToCommunity = useCallback(() => setAddToCommunityCardId(null), []);

  const openReport = useCallback((cardId: string) => {
    setReportCardId(cardId);
    setCardOptionsCardId(null);
  }, []);

  const closeReport = useCallback(() => setReportCardId(null), []);

  return {
    cardOptionsCardId,
    cardOptionsIsOwnCard,
    reportCardId,
    addToCommunityCardId,
    openCardOptions,
    closeCardOptions,
    openAddToCommunity,
    closeAddToCommunity,
    openReport,
    closeReport,
  };
}
