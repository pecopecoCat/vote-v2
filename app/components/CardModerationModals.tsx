"use client";

import AddToCommunityModal from "./AddToCommunityModal";
import CardOptionsModal from "./CardOptionsModal";
import ReportViolationModal from "./ReportViolationModal";

export interface CardModerationModalsProps {
  cardOptionsCardId: string | null;
  cardOptionsIsOwnCard: boolean;
  reportCardId: string | null;
  addToCommunityCardId?: string | null;
  isLoggedIn?: boolean;
  onCloseOptions: () => void;
  onHideCard: (cardId: string) => void;
  onReportCard: (cardId: string) => void;
  onCloseReport: () => void;
  onAddToCommunity?: (cardId: string) => void;
  onCloseAddToCommunity?: () => void;
  onCollectionsUpdated?: () => void;
}

/** カードの … メニュー + 通報 + コミュニティ追加モーダル（各ページで共通） */
export default function CardModerationModals({
  cardOptionsCardId,
  cardOptionsIsOwnCard,
  reportCardId,
  addToCommunityCardId = null,
  isLoggedIn = false,
  onCloseOptions,
  onHideCard,
  onReportCard,
  onCloseReport,
  onAddToCommunity,
  onCloseAddToCommunity,
  onCollectionsUpdated,
}: CardModerationModalsProps) {
  return (
    <>
      {cardOptionsCardId != null && (
        <CardOptionsModal
          cardId={cardOptionsCardId}
          isOwnCard={cardOptionsIsOwnCard}
          onClose={onCloseOptions}
          onAddToCommunity={onAddToCommunity}
          onHide={onHideCard}
          onReport={onReportCard}
        />
      )}
      {reportCardId != null && (
        <ReportViolationModal cardId={reportCardId} onClose={onCloseReport} />
      )}
      {addToCommunityCardId != null && onCloseAddToCommunity && (
        <AddToCommunityModal
          cardId={addToCommunityCardId}
          onClose={onCloseAddToCommunity}
          isLoggedIn={isLoggedIn}
          onCollectionsUpdated={onCollectionsUpdated}
        />
      )}
    </>
  );
}
