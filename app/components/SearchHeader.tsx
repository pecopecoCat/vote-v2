"use client";

import Link from "next/link";

export interface SearchHeaderProps {
  /** 検索窓の値（タグ名やキーワード） */
  value: string;
  /** 値変更時（親で state を更新） */
  onChange?: (value: string) => void;
  /** 検索送信時（Enter や実行時） */
  onSubmit?: (value: string) => void;
  /** 戻る先 URL（未指定時は history.back） */
  backHref?: string;
  placeholder?: string;
}

export default function SearchHeader({
  value,
  onChange,
  onSubmit,
  backHref,
  placeholder = "検索",
}: SearchHeaderProps) {
  return (
    <header className="sticky top-0 z-20 flex items-center gap-2 bg-[#FFE100] px-[5.333vw] py-3 shadow-sm">
      {backHref != null ? (
        <Link
          href={backHref}
          className="flex h-10 w-10 shrink-0 items-center justify-center text-gray-700"
          aria-label="戻る"
        >
          <BackIcon className="h-6 w-6" />
        </Link>
      ) : (
        <button
          type="button"
          className="flex h-10 w-10 shrink-0 items-center justify-center text-gray-700"
          aria-label="戻る"
          onClick={() => window.history.back()}
        >
          <BackIcon className="h-6 w-6" />
        </button>
      )}
      <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg bg-white px-3 py-2 shadow-sm">
        <MagnifyIcon className="h-5 w-5 shrink-0 text-gray-400" />
        <input
          type="search"
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onSubmit?.(value);
          }}
          placeholder={placeholder}
          className="search-header-input min-w-0 flex-1 bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400"
          aria-label="検索"
        />
        {value.length > 0 && (
          <button
            type="button"
            className="shrink-0 text-gray-400 hover:text-gray-600"
            aria-label="クリア"
            onClick={() => onChange?.("")}
          >
            <ClearIcon className="h-5 w-5" />
          </button>
        )}
      </div>
    </header>
  );
}

function BackIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  );
}

function MagnifyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
      />
    </svg>
  );
}

function ClearIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z" />
    </svg>
  );
}
