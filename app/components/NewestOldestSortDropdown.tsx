"use client";

import { useState, useEffect, useId } from "react";

export type NewestOldestSortOrder = "newest" | "oldest";

export interface NewestOldestSortDropdownProps {
  value: NewestOldestSortOrder;
  onChange: (order: NewestOldestSortOrder) => void;
  /** ドロップダウンパネルの水平位置（コメント一覧は right） */
  menuAlign?: "left" | "right";
}

const OPTIONS: { value: NewestOldestSortOrder; label: string }[] = [
  { value: "newest", label: "新着順" },
  { value: "oldest", label: "古い順" },
];

/** 白ピル・12px/#787878 ラベル・枠 #DADADA・黄丸に下向き矢印の並び替え UI */
export default function NewestOldestSortDropdown({
  value,
  onChange,
  menuAlign = "left",
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
        className="flex min-h-[36px] min-w-[7.75rem] items-center justify-between gap-2 rounded-full border border-[#DADADA] bg-white py-1.5 pl-3.5 pr-1.5 text-left text-[12px] font-normal leading-none text-[#787878] shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-shadow duration-200 hover:shadow-[0_1px_3px_rgba(0,0,0,0.06)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-base)] focus-visible:ring-offset-2 focus-visible:ring-offset-white"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        aria-label="並び順"
        onClick={() => setOpen((o) => !o)}
      >
        <span className="min-w-0 flex-1 text-left tracking-tight">
          {value === "newest" ? "新着順" : "古い順"}
        </span>
        <span className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full bg-[var(--color-brand-base)]">
          <img
            src="/icons/icon_b_arrow.svg"
            alt=""
            className={`h-2.5 w-2.5 shrink-0 transition-transform duration-200 ease-out ${open ? "rotate-180" : ""}`}
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
            id={listboxId}
            className={`absolute top-full z-20 mt-2 min-w-[148px] overflow-hidden rounded-xl border border-[#DADADA] bg-white py-1 shadow-[0_8px_30px_rgba(0,0,0,0.12)] ${menuPosition}`}
            role="listbox"
          >
            {OPTIONS.map((opt) => {
              const selected = value === opt.value;
              return (
                <li key={opt.value} role="option" aria-selected={selected}>
                  <button
                    type="button"
                    className={`w-full px-3.5 py-2.5 text-left text-sm transition-colors duration-150 ${
                      selected
                        ? "bg-[color-mix(in_srgb,var(--color-brand-base)_28%,white)] font-bold text-[var(--color-text-default)]"
                        : "font-medium text-[var(--color-text-soft-black)] hover:bg-[var(--color-bg)]"
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
