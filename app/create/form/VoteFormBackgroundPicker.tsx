"use client";

import { CARD_BACKGROUND_IMAGES } from "../../data/voteCards";

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
    </svg>
  );
}

type VoteFormBackgroundPickerProps = {
  selectedUrl: string;
  onSelect: (url: string) => void;
};

export default function VoteFormBackgroundPicker({ selectedUrl, onSelect }: VoteFormBackgroundPickerProps) {
  return (
    <section>
      <h2 className="mb-2 text-sm font-bold text-gray-900">背景デザイン</h2>
      <div className="flex gap-1.5 overflow-x-auto pb-2 pr-2 pt-2">
        {CARD_BACKGROUND_IMAGES.map((url) => (
          <button
            key={url}
            type="button"
            onClick={() => onSelect(url)}
            className={`relative h-14 w-14 shrink-0 overflow-visible rounded-full ${
              selectedUrl === url
                ? "border-[6px] border-[#FFE100] ring-2 ring-inset ring-white shadow-[0_2px_2px_0_rgba(0,0,0,0.08)]"
                : "border-[6px] border-transparent"
            }`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt=""
              className="h-full w-full rounded-full object-contain"
              loading="lazy"
              decoding="async"
            />
            {selectedUrl === url && (
              <span className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-black shadow-[0_2px_2px_0_rgba(0,0,0,0.08)]">
                <CheckIcon className="h-3 w-3 text-white" />
              </span>
            )}
          </button>
        ))}
      </div>
    </section>
  );
}
