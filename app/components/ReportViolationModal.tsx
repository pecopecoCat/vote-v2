"use client";

import { useState } from "react";

const REPORT_REASONS = [
  "無礼、侮辱的内容",
  "個人情報を含んでいる",
  "特定の人物への嫌がらせ",
  "一部の国地域で規定されている保護対象の差別をしている",
  "脅迫行為や暴力を助長する",
  "自殺または自傷行為を助長、示唆している",
] as const;

export interface ReportViolationModalProps {
  onClose: () => void;
  /** 報告対象の cardId（将来メール送信時に使用。今は未使用でOK） */
  cardId?: string | null;
}

export default function ReportViolationModal({
  onClose,
  cardId: _cardId,
}: ReportViolationModalProps) {
  const [selectedReason, setSelectedReason] = useState<string>("");

  const handleSubmit = () => {
    if (selectedReason) {
      // 未実装：ここでメール送信など
    }
    onClose();
  };

  return (
    <>
      <div
        className="fixed inset-0 z-[60] bg-black/50"
        aria-hidden
        onClick={onClose}
      />
      <div
        className="report-violation-modal fixed left-1/2 top-1/2 z-[70] w-[calc(100%-32px)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-[20px] bg-white px-5 pt-8 pb-7 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-violation-title"
      >
        <h2
          id="report-violation-title"
          className="text-lg font-bold leading-snug text-[#191919]"
        >
          違反報告
        </h2>
        <p className="mt-3 text-sm font-normal leading-relaxed text-[#333333]">
          この意見またはコメントが不適切または攻撃的である理由を選択してください。
        </p>

        <ul className="mt-5 space-y-4">
          {REPORT_REASONS.map((reason) => (
            <li key={reason}>
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="radio"
                  name="reportReason"
                  value={reason}
                  checked={selectedReason === reason}
                  onChange={() => setSelectedReason(reason)}
                  className="report-violation-radio"
                />
                <span className="min-w-0 flex-1 pt-0.5 text-sm font-normal leading-snug text-[#191919]">
                  {reason}
                </span>
              </label>
            </li>
          ))}
        </ul>

        <div className="mt-10 flex flex-col items-stretch">
          <button
            type="button"
            onClick={handleSubmit}
            className="w-full rounded-xl bg-black py-3.5 text-center text-sm font-bold text-white transition-opacity hover:opacity-90 active:opacity-90"
          >
            違反報告
          </button>
          <button
            type="button"
            onClick={onClose}
            className="mt-5 flex items-center justify-center gap-1 text-sm font-normal text-[#0779F1] hover:underline"
          >
            <span className="text-base leading-none" aria-hidden>
              ✕
            </span>
            閉じる
          </button>
        </div>
      </div>
    </>
  );
}
