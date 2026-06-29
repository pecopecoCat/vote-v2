"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import AppHeader from "./AppHeader";
import { COLLECTION_VISIBILITY_LABEL } from "../data/collectionCategories";
import { getCollectionGradientStyle } from "../data/search";
import { useSharedData } from "../context/SharedDataContext";
import {
  isCardInContributableCollection,
  useContributableCollections,
  useGroupedContributableRows,
} from "../hooks/useContributableCollections";
import type { ContributableCollection } from "../lib/contributableCollections";
import { getCollectionThumbnailUrl } from "../lib/getCollectionThumbnailUrl";

function CollectionToggleIcon({ selected, disabled }: { selected: boolean; disabled?: boolean }) {
  if (selected) {
    return (
      <span
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#FFE100] ${disabled ? "opacity-60" : ""}`}
        aria-hidden
      >
        <svg className="h-4 w-4" fill="#191919" viewBox="0 0 24 24">
          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
        </svg>
      </span>
    );
  }
  return (
    <span
      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#E5E7EB] ${disabled ? "opacity-50" : ""}`}
      aria-hidden
    >
      <img src="/icons/icon_plus.svg" alt="" className="h-2.5 w-2.5" width={10} height={10} />
    </span>
  );
}

function CollectionPickerThumbnail({ row }: { row: ContributableCollection }) {
  const { createdVotesForTimeline } = useSharedData();
  const thumbnailUrl = useMemo(
    () =>
      getCollectionThumbnailUrl(
        { id: row.id, cardIds: row.cardIds, coverImageUrl: row.coverImageUrl },
        createdVotesForTimeline
      ),
    [row, createdVotesForTimeline]
  );
  const gradientStyle = getCollectionGradientStyle(row.gradient, row.color);

  return (
    <span className="h-12 w-12 shrink-0 overflow-hidden rounded-full bg-[#EBEBEB] ring-1 ring-black/[0.06]">
      {thumbnailUrl ? (
        <img src={thumbnailUrl} alt="" className="h-full w-full object-cover" width={48} height={48} />
      ) : (
        <span className="block h-full w-full" style={gradientStyle} aria-hidden />
      )}
    </span>
  );
}

function collectionMeta(row: ContributableCollection): string {
  if (row.disabledReason) return row.disabledReason;
  const parts: string[] = [];
  parts.push(COLLECTION_VISIBILITY_LABEL[row.visibility]);
  parts.push(`${row.cardIds.length}件`);
  return parts.join(" · ");
}

function SectionHeader({ children }: { children: string }) {
  return (
    <li className="sticky top-0 z-[1] bg-[#F5F5F5] px-5 py-2">
      <span className="text-xs font-bold text-[#787878]">{children}</span>
    </li>
  );
}

type CollectionPickerRowProps = {
  row: ContributableCollection;
  selected: boolean;
  disabled: boolean;
  onClick: () => void;
};

function CollectionPickerRow({ row, selected, disabled, onClick }: CollectionPickerRowProps) {
  return (
    <li>
      <button
        type="button"
        className="flex w-full items-center gap-3 bg-white px-5 py-3.5 text-left text-[#191919] transition-colors active:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={disabled}
        onClick={onClick}
      >
        <CollectionPickerThumbnail row={row} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-bold leading-snug">{row.name}</span>
          <span className="mt-0.5 block truncate text-xs text-[#8A8A8A]">{collectionMeta(row)}</span>
        </span>
        <CollectionToggleIcon selected={selected} disabled={disabled} />
      </button>
    </li>
  );
}

export type CollectionPickerBodyProps = {
  mode: "select" | "toggle";
  cardId?: string;
  selectedIds: string[];
  onSelectedIdsChange?: (ids: string[]) => void;
  onRowToggle?: (row: ContributableCollection) => void | Promise<void>;
  onCreateNew?: () => void;
  showCreateButton?: boolean;
};

export function CollectionPickerBody({
  mode,
  cardId,
  selectedIds,
  onSelectedIdsChange,
  onRowToggle,
  onCreateNew,
  showCreateButton = true,
}: CollectionPickerBodyProps) {
  const [query, setQuery] = useState("");
  const { rows, loading } = useContributableCollections(cardId);
  const { owned, public: publicRows } = useGroupedContributableRows(rows, query);
  const hasResults = owned.length > 0 || publicRows.length > 0;
  const showSections = !query.trim();

  const getRowState = (row: ContributableCollection) => {
    const selected =
      mode === "select"
        ? selectedIds.includes(row.id)
        : cardId
          ? isCardInContributableCollection(row, cardId)
          : false;
    const disabled =
      mode === "select"
        ? !row.canAdd && !selected
        : selected
          ? !row.canRemove
          : !row.canAdd;
    return { selected, disabled };
  };

  const handleRowClick = (row: ContributableCollection) => {
    if (mode === "select") {
      if (!row.canAdd && !selectedIds.includes(row.id)) return;
      const next = selectedIds.includes(row.id)
        ? selectedIds.filter((id) => id !== row.id)
        : [...selectedIds, row.id];
      onSelectedIdsChange?.(next);
      return;
    }
    if (!cardId) return;
    const selected = isCardInContributableCollection(row, cardId);
    if (selected && !row.canRemove) return;
    if (!selected && !row.canAdd) return;
    void onRowToggle?.(row);
  };

  const emptyMessage = useMemo(() => {
    if (loading) return null;
    if (query.trim()) return "該当するコレクションがありません。";
    return "コレクションがありません。下のボタンから作成できます。";
  }, [loading, query]);

  const renderRow = (row: ContributableCollection) => {
    const { selected, disabled } = getRowState(row);
    return (
      <CollectionPickerRow
        key={row.id}
        row={row}
        selected={selected}
        disabled={disabled}
        onClick={() => handleRowClick(row)}
      />
    );
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[#F1F1F1]">
      <div className="shrink-0 space-y-3 border-b border-[#DADADA] bg-white px-5 py-3">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="名前・カテゴリで検索"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          className="w-full rounded-[10px] border border-[#DADADA] bg-white px-3 py-2.5 text-base text-[#191919] outline-none focus:border-[#0779F1]"
        />
        {mode === "select" && selectedIds.length > 0 ? (
          <p className="text-center text-xs font-bold text-[#0779F1]">{selectedIds.length}件選択中</p>
        ) : null}
        {showCreateButton && onCreateNew ? (
          <button
            type="button"
            className="flex w-full items-center justify-center gap-2 rounded-[10px] border border-[#191919] bg-white px-4 py-3 text-sm font-bold text-[#191919] active:bg-gray-50"
            onClick={onCreateNew}
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#FFE100]">
              <img src="/icons/icon_plus.svg" alt="" className="h-2.5 w-2.5" width={10} height={10} />
            </span>
            新しいコレクションを作成
          </button>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {loading ? (
          <p className="px-5 py-8 text-center text-sm text-gray-500">読み込み中…</p>
        ) : !hasResults ? (
          <p className="px-5 py-8 text-center text-sm text-gray-500">{emptyMessage}</p>
        ) : (
          <ul className="divide-y divide-[#DADADA]">
            {showSections && owned.length > 0 ? (
              <>
                <SectionHeader>自分のコレクション</SectionHeader>
                {owned.map(renderRow)}
              </>
            ) : (
              owned.map(renderRow)
            )}
            {showSections && publicRows.length > 0 ? (
              <>
                <SectionHeader>公開コレクション</SectionHeader>
                {publicRows.map(renderRow)}
              </>
            ) : (
              publicRows.map(renderRow)
            )}
          </ul>
        )}
      </div>
    </div>
  );
}

type CollectionPickerScreenProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** viewport: 画面全体（サイドナビ分オフセット） / contained: 親モーダル内いっぱい */
  scope?: "viewport" | "contained";
};

function CollectionPickerDoneButton({ onClose }: { onClose: () => void }) {
  return (
    <button
      type="button"
      className="rounded-full bg-white px-3.5 py-1.5 text-sm font-bold text-[#191919] transition-opacity hover:opacity-90 active:opacity-95"
      aria-label="完了"
      onClick={onClose}
    >
      完了
    </button>
  );
}

export function CollectionPickerScreen({
  open,
  onClose,
  title,
  children,
  scope = "viewport",
}: CollectionPickerScreenProps) {
  if (!open) return null;

  const isContained = scope === "contained";

  if (isContained) {
    return (
      <div
        className="absolute inset-0 z-[100] flex flex-col bg-[#F1F1F1]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="collection-picker-title"
      >
        <AppHeader
          type="title"
          title={title}
          onBack={onClose}
          className="!pr-2.5"
          right={<CollectionPickerDoneButton onClose={onClose} />}
        />
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100]" role="presentation">
      <button
        type="button"
        className="absolute inset-0 hidden bg-black/50 md:block"
        aria-label="閉じる"
        onClick={onClose}
      />
      <div
        className="collection-picker-screen fixed inset-0 z-10 flex flex-col bg-[#F1F1F1] md:inset-auto md:left-1/2 md:top-1/2 md:max-h-[min(900px,90dvh)] md:w-[min(480px,calc(100vw-32px))] md:-translate-x-1/2 md:-translate-y-1/2 md:overflow-hidden md:rounded-2xl md:shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="collection-picker-title"
      >
        <AppHeader
          type="title"
          title={title}
          onBack={onClose}
          className="!pr-2.5"
          right={<CollectionPickerDoneButton onClose={onClose} />}
        />
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
      </div>
    </div>
  );
}

type CollectionPickerSheetProps = CollectionPickerBodyProps & {
  open: boolean;
  onClose: () => void;
  title?: string;
  scope?: "viewport" | "contained";
};

export default function CollectionPickerSheet({
  open,
  onClose,
  title = "コレクションを選ぶ",
  scope = "viewport",
  ...bodyProps
}: CollectionPickerSheetProps) {
  return (
    <CollectionPickerScreen open={open} onClose={onClose} title={title} scope={scope}>
      <CollectionPickerBody {...bodyProps} />
    </CollectionPickerScreen>
  );
}
