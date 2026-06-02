"use client";

import CardOptionsModal from "./CardOptionsModal";
import ReportViolationModal from "./ReportViolationModal";

export interface CardModerationModalsProps {
  cardOptionsCardId: string | null;
  cardOptionsIsOwnCard: boolean;
  reportCardId: string | null;
  onCloseOptions: () => void;
  onHideCard: (cardId: string) => void;
  onReportCard: (cardId: string) => void;
  onCloseReport: () => void;
}

/** カードの … メニュー + 通報モーダル（各ページで共通） */
export default function CardModerationModals({
  cardOptionsCardId,
  cardOptionsIsOwnCard,
  reportCardId,
  onCloseOptions,
  onHideCard,
  onReportCard,
  onCloseReport,
}: CardModerationModalsProps) {
  return (
    <>
      {cardOptionsCardId != null && (
        <CardOptionsModal
          cardId={cardOptionsCardId}
          isOwnCard={cardOptionsIsOwnCard}
          onClose={onCloseOptions}
          onHide={onHideCard}
          onReport={onReportCard}
        />
      )}
      {reportCardId != null && (
        <ReportViolationModal cardId={reportCardId} onClose={onCloseReport} />
      )}
    </>
  );
}
