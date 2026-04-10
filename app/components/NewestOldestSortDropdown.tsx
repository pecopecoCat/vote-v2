"use client";

import { useState, useEffect } from "react";

export type NewestOldestSortOrder = "newest" | "oldest";

export interface NewestOldestSortDropdownProps {
  value: NewestOldestSortOrder;
  onChange: (order: NewestOldestSortOrder) => void;
  /** ドロップダウンパネルの水平位置（コメント一覧は right） */
  menuAlign?: "left" | "right";
}

/** マイページ・コメント一覧と同じ白ピル＋黄丸矢印の並び替え UI */
export default function NewestOldestSortDropdown({
  value,
  onChange,
  menuAlign = "left",
}: NewestOldestSortDropdownProps) {
  const [open, setOpen] = useState(false);

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
    <div className="relative">
      <button
        type="button"
        className="flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-bold text-gray-900 shadow-[0_1px_3px_rgba(0,0,0,0.08)]"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="並び順"
        onClick={() => setOpen((o) => !o)}
      >
        {value === "newest" ? "新着順" : "古い順"}
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#FFE100]">
          <img
            src="/icons/icon_b_arrow.svg"
            alt=""
            className="h-2.5 w-2.5 shrink-0"
            width={10}
            height={8}
          />
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
            className={`absolute top-full z-20 mt-1 min-w-[120px] rounded-lg border border-gray-200 bg-white py-1 shadow-lg ${menuPosition}`}
            role="listbox"
          >
            <li role="option" aria-selected={value === "newest"}>
              <button
                type="button"
                className="w-full px-4 py-2 text-left text-sm font-medium text-gray-900 hover:bg-gray-50"
                onClick={() => {
                  onChange("newest");
                  setOpen(false);
                }}
              >
                新着順
              </button>
            </li>
            <li role="option" aria-selected={value === "oldest"}>
              <button
                type="button"
                className="w-full px-4 py-2 text-left text-sm font-medium text-gray-900 hover:bg-gray-50"
                onClick={() => {
                  onChange("oldest");
                  setOpen(false);
                }}
              >
                古い順
              </button>
            </li>
          </ul>
        </>
      )}
    </div>
  );
}
