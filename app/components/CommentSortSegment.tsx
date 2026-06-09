"use client";

import type { CommentSortOrder } from "../lib/commentSort";

export interface CommentSortSegmentProps {
  value: CommentSortOrder;
  onChange: (order: CommentSortOrder) => void;
}

const OPTIONS: { value: CommentSortOrder; label: string; minWidth: string }[] = [
  { value: "trending", label: "急上昇中", minWidth: "min-w-[5.25rem]" },
  { value: "newest", label: "新着", minWidth: "min-w-[3.5rem]" },
];

export default function CommentSortSegment({ value, onChange }: CommentSortSegmentProps) {
  return (
    <div
      className="inline-flex min-h-[44px] shrink-0 rounded-full border border-[#DADADA] bg-white p-0.5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] [touch-action:manipulation]"
      role="group"
      aria-label="コメントの並び順"
    >
      {OPTIONS.map((opt) => {
        const selected = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(opt.value)}
            className={`min-h-[40px] ${opt.minWidth} rounded-full px-3 py-2 text-center text-[12px] font-medium leading-none transition-colors ${
              selected
                ? "bg-[#FFE100] text-[#191919] shadow-[0_1px_2px_rgba(0,0,0,0.06)]"
                : "bg-transparent text-[#787878] active:bg-gray-100"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
