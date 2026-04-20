"use client";

/**
 * 並び替えはカスタムドロップダウン（button + listbox）。
 * ネイティブ <select> / OS のピッカーでは、黄丸矢印・ピル型・行ごとの薄黄ハイライトなど
 * このデザインは再現できない（モバイルでは多くのブラウザが独自 UI を出す）ため、
 * モバイル Web でも見た目を揃えるにはこの方式が適切。
 */
import { useState, useEffect, useId } from "react";

export type NewestOldestSortOrder = "newest" | "oldest";

export interface NewestOldestSortDropdownProps {
  value: NewestOldestSortOrder;
  onChange: (order: NewestOldestSortOrder) => void;
  /** ドロップダウンパネルの水平位置（コメント一覧は right） */
  menuAlign?: "left" | "right";
  /** 黄丸内の下向き矢印の線色（既定は #191919） */
  arrowStroke?: string;
}

const OPTIONS: { value: NewestOldestSortOrder; label: string }[] = [
  { value: "newest", label: "新着順" },
  { value: "oldest", label: "古い順" },
];

/** 白ピル・枠 #DADADA・黄丸に矢印（開閉で回転・線色は arrowStroke）・リストは選択行を薄黄ハイライト */
export default function NewestOldestSortDropdown({
  value,
  onChange,
  menuAlign = "left",
  arrowStroke = "#191919",
}: NewestOldestSortDropdownProps) {
  const [open, setOpen] = useState(false);
  const baseId = useId();
  const listboxId = `${baseId}-sort-listbox`;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const menuPosition = menuAlign === "right" ? "right-0" : "left-0";

  return (
    <div className="relative inline-flex">
      <button
        type="button"
        className="flex min-h-[40px] min-w-[8.5rem] items-center justify-between gap-2 rounded-full border border-[#DADADA] bg-white py-2 pl-4 pr-2 text-left text-[13px] font-medium leading-none text-[#191919] transition-shadow duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-base)] focus-visible:ring-offset-2 focus-visible:ring-offset-white"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        aria-label="並び順"
        onClick={() => setOpen((o) => !o)}
      >
        <span className="min-w-0 flex-1 text-left tracking-tight">
          {value === "newest" ? "新着順" : "古い順"}
        </span>
        <span className="flex h-[28px] w-[28px] shrink-0 items-center justify-center rounded-full bg-[#FFE100] shadow-[0_1px_2px_rgba(0,0,0,0.06)]">
          <svg
            className={`h-2.5 w-2.5 shrink-0 transition-transform duration-200 ease-out ${open ? "rotate-180" : ""}`}
            width={10}
            height={8}
            viewBox="0 0 8 6"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden
          >
            <path
              d="M1 1L4 4L7 1"
              stroke={arrowStroke}
              strokeWidth={2}
              strokeLinecap="round"
            />
          </svg>
        </span>
      </button>
      {open && (
        <>
          <div
            className="fixed inset-0 z-10"
            aria-hidden
            onClick={() => setOpen(false)}
          />
          <ul
            id={listboxId}
            className={`absolute top-full z-20 mt-1.5 min-w-full overflow-hidden rounded-[14px] border border-[#DADADA] bg-white py-1 shadow-[0_2px_10px_rgba(0,0,0,0.06)] ${menuPosition}`}
            role="listbox"
          >
            {OPTIONS.map((opt) => {
              const selected = value === opt.value;
              return (
                <li key={opt.value} role="option" aria-selected={selected}>
                  <button
                    type="button"
                    className={`w-full px-4 py-3 text-left text-[13px] transition-colors duration-150 ${
                      selected
                        ? "bg-[#FFF9E0] font-bold text-[#191919]"
                        : "bg-white font-normal text-[#191919] hover:bg-[#F8F8F8]"
                    }`}
                    onClick={() => {
                      onChange(opt.value);
                      setOpen(false);
                    }}
                  >
                    {opt.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
