"use client";

/**
 * 並び替えは「新着順 / 古い順」の2ボタン（セグメント）で切り替え。
 * 透明 select やカスタム portal は Safari でタップが効かないことがあるため使わない。
 */

export type NewestOldestSortOrder = "newest" | "oldest";

export interface NewestOldestSortDropdownProps {
  value: NewestOldestSortOrder;
  onChange: (order: NewestOldestSortOrder) => void;
  /** 互換用（旧 API。レイアウトは親任せ） */
  menuAlign?: "left" | "right";
  /** 互換用（旧ピル矢印色。セグメント UI では未使用） */
  arrowStroke?: string;
}

const OPTIONS: { value: NewestOldestSortOrder; label: string }[] = [
  { value: "newest", label: "新着順" },
  { value: "oldest", label: "古い順" },
];

export default function NewestOldestSortDropdown({
  value,
  onChange,
  menuAlign: _menuAlign = "left",
  arrowStroke: _arrowStroke = "#191919",
}: NewestOldestSortDropdownProps) {
  return (
    <div
      className="inline-flex min-h-[44px] shrink-0 rounded-full border border-[#DADADA] bg-white p-0.5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] [touch-action:manipulation]"
      role="group"
      aria-label="並び順"
    >
      {OPTIONS.map((opt) => {
        const selected = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(opt.value)}
            className={`min-h-[40px] min-w-[4.5rem] rounded-full px-3 py-2 text-center text-[12px] font-medium leading-none transition-colors ${
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
