"use client";

import AppHeader from "../../components/AppHeader";

type CreateVoteFormHeaderProps = {
  variant: "page" | "modal";
  onClose?: () => void;
  onSaveDraft: () => void;
};

export default function CreateVoteFormHeader({ variant, onClose, onSaveDraft }: CreateVoteFormHeaderProps) {
  const draftButton = (
    <button
      type="button"
      onClick={onSaveDraft}
      className={`shrink-0 whitespace-nowrap rounded-[10px] border-2 border-[#FFE100] bg-white text-sm font-bold text-gray-900 ${
        variant === "modal" ? "px-3 py-2" : "px-3 py-2.5"
      }`}
    >
      下書き
    </button>
  );

  if (variant === "modal") {
    return (
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-gray-200 bg-white px-4 py-3">
        <button
          type="button"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full hover:bg-gray-100"
          aria-label="閉じる"
          onClick={onClose}
        >
          <img src="/icons/icon_close.svg" alt="" className="h-3.5 w-3.5" width={14} height={14} />
        </button>
        <h1 className="min-w-0 flex-1 truncate text-center text-base font-bold text-gray-900">VOTEを作成</h1>
        {draftButton}
      </div>
    );
  }

  return <AppHeader type="title" title="VOTEを作成" right={draftButton} />;
}
