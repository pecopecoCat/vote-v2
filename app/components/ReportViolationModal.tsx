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
  cardId,
}: ReportViolationModalProps) {
  const [selectedReason, setSelectedReason] = useState<string>("");

  const handleSubmit = () => {
    // 未実装：ここでメール送信など。今は no-op でOK
    if (selectedReason) {
      // console.log("違反報告", { cardId, reason: selectedReason });
    }
    onClose();
  };

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/50"
        aria-hidden
        onClick={onClose}
      />
      <div className="fixed left-1/2 top-1/2 z-50 w-[90%] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-lg">
        <h2 className="text-lg font-bold text-gray-900">違反報告</h2>
        <p className="mt-2 text-sm text-gray-600">
          この意見またはコメントが不適切または攻撃的である理由を選択ください。
        </p>
        <ul className="mt-4 space-y-2">
          {REPORT_REASONS.map((reason) => (
            <li key={reason}>
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="reportReason"
                  value={reason}
                  checked={selectedReason === reason}
                  onChange={() => setSelectedReason(reason)}
                  className="h-4 w-4 border-gray-300 text-blue-600"
                />
                <span className="text-sm text-gray-900">{reason}</span>
              </label>
            </li>
          ))}
        </ul>
        <div className="mt-6 flex flex-col gap-2">
          <button
            type="button"
            onClick={handleSubmit}
            className="w-full rounded-lg bg-gray-900 py-3 text-sm font-medium text-white"
          >
            違反報告
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex items-center justify-center gap-1 text-sm text-blue-600"
          >
            <span aria-hidden>×</span> 閉じる
          </button>
        </div>
      </div>
    </>
  );
}
