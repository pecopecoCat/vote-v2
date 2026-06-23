"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  getCollections,
  toggleCardInCollection,
  removeCardFromCollection,
  createOwnedCollectionFromSettings,
  getCollectionsUpdatedEventName,
  type Collection,
} from "../data/collections";
import { addBookmark, isCardBookmarked, getBookmarksUpdatedEventName } from "../data/bookmarks";
import { removeBookmarkFully } from "../data/bookmarkRemove";
import { showAppToast } from "../lib/appToast";
import { type CollectionGradient } from "../data/search";
import { useSharedData } from "../context/SharedDataContext";
import Button from "./Button";
import CollectionSettingsModal from "./CollectionSettingsModal";

interface BookmarkCollectionModalProps {
  cardId: string | null;
  onClose: () => void;
  onCollectionsUpdated?: () => void;
  /** 関係図: コレクションはログイン後のユーザーが作る。未ログイン時はログイン促進を表示 */
  isLoggedIn?: boolean;
}

function BookmarkModalDivider() {
  return <div className="h-px w-full bg-[#DADADA]" aria-hidden />;
}

function CollectionToggleIcon({ selected }: { selected: boolean }) {
  if (selected) {
    return (
      <span
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#FFE100]"
        aria-hidden
      >
        <svg className="h-3.5 w-3.5" fill="#191919" viewBox="0 0 24 24">
          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
        </svg>
      </span>
    );
  }
  return (
    <span
      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#E5E7EB]"
      aria-hidden
    >
      <img src="/icons/icon_plus.svg" alt="" className="h-2.5 w-2.5" width={10} height={10} />
    </span>
  );
}

function BookmarkModalShell({
  children,
  footer,
  onComplete,
}: {
  children: ReactNode;
  footer?: ReactNode;
  onComplete: () => void;
}) {
  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/50" aria-hidden onClick={onComplete} />
      <div
        className="fixed inset-x-0 bottom-0 z-[70] flex max-h-[85vh] flex-col overflow-hidden rounded-t-[30px] bg-white shadow-lg"
        role="dialog"
        aria-labelledby="bookmark-modal-title"
      >
        <div className="grid shrink-0 grid-cols-[1fr_auto_1fr] items-center border-b border-[#DADADA] px-5 py-3">
          <div />
          <h2 id="bookmark-modal-title" className="text-lg font-bold text-[#191919]">
            Bookmark
          </h2>
          <div className="flex justify-end">
            <button
              type="button"
              className="text-sm font-bold text-[#0779F1]"
              aria-label="完了"
              onClick={onComplete}
            >
              完了
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>

        {footer ? (
          <div className="shrink-0 space-y-3 border-t border-[#DADADA] px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] pt-4">
            {footer}
          </div>
        ) : null}
      </div>
    </>
  );
}

export default function BookmarkCollectionModal({
  cardId,
  onClose,
  onCollectionsUpdated,
  isLoggedIn = false,
}: BookmarkCollectionModalProps) {
  const shared = useSharedData();
  const [collections, setCollections] = useState<Collection[]>([]);

  useEffect(() => {
    if (isLoggedIn) void shared.ensureCollectionsHydrated();
  }, [isLoggedIn, shared.ensureCollectionsHydrated]);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const bookmarkSideEffectsDoneRef = useRef(false);

  useEffect(() => {
    if (isLoggedIn) setCollections(getCollections());
  }, [cardId, isLoggedIn]);

  /** モーダルを開いた＝Bookmarkに登録（まとめはコレクションで） */
  useEffect(() => {
    if (!isLoggedIn || !cardId) return;
    addBookmark(cardId);
    if (!shared.isRemote || bookmarkSideEffectsDoneRef.current) return;
    bookmarkSideEffectsDoneRef.current = true;
    void shared.recordBookmarkEvent(cardId);
  }, [isLoggedIn, cardId, shared.isRemote, shared.recordBookmarkEvent]);

  useEffect(() => {
    bookmarkSideEffectsDoneRef.current = false;
  }, [cardId]);

  useEffect(() => {
    const eventName = getCollectionsUpdatedEventName();
    const handler = () => {
      setCollections(getCollections());
      onCollectionsUpdated?.();
    };
    window.addEventListener(eventName, handler);
    return () => window.removeEventListener(eventName, handler);
  }, [onCollectionsUpdated]);

  useEffect(() => {
    const eventName = getBookmarksUpdatedEventName();
    const handler = () => onCollectionsUpdated?.();
    window.addEventListener(eventName, handler);
    return () => window.removeEventListener(eventName, handler);
  }, [onCollectionsUpdated]);

  const handleToggle = (collectionId: string) => {
    if (!cardId) return;
    toggleCardInCollection(collectionId, cardId);
    setCollections(getCollections());
    onCollectionsUpdated?.();
  };

  const handleSaveNewCollection = async (
    name: string,
    gradient: CollectionGradient,
    visibility: "public" | "private" | "member"
  ) => {
    await createOwnedCollectionFromSettings(name, {
      gradient,
      visibility,
      cardId: cardId ?? undefined,
    });
    setCollections(getCollections());
    onCollectionsUpdated?.();
    setShowSettingsModal(false);
  };

  if (cardId == null) return null;

  const handleComplete = () => {
    showAppToast("Bookmarkしました");
    onClose();
  };

  /** 関係図: ログイン後のユーザーがコレクションを作成・管理。未ログイン時はログイン促進 */
  if (!isLoggedIn) {
    return (
      <BookmarkModalShell onComplete={onClose}>
        <div className="flex flex-col items-center justify-center gap-4 px-5 py-10 text-center">
          <p className="text-sm font-bold text-[#191919]">
            ブックマーク・コミュニティを使うには
            <br />
            ログインしてください。
          </p>
          <Link
            href="/profile/login"
            className="rounded-[10px] bg-[#191919] px-6 py-3 text-center text-sm font-bold text-white hover:opacity-90"
            onClick={onClose}
          >
            ログインする
          </Link>
        </div>
      </BookmarkModalShell>
    );
  }

  /** 自分が管理するコレクションのみ（参加中の他人コレクションは KV とズレるため除外） */
  const manageableCollections = collections.filter((c) => !c.joinedParticipation);

  const isInCollection = (c: Collection) => c.cardIds.includes(cardId);
  /** ALL＝どのコレクションにも入れない（Bookmarkには残る） */
  const isInAll = !manageableCollections.some((c) => c.cardIds.includes(cardId));
  const bookmarked = isCardBookmarked(cardId);

  const handleSelectAll = () => {
    if (!cardId) return;
    manageableCollections.forEach((col) => {
      if (col.cardIds.includes(cardId)) removeCardFromCollection(col.id, cardId);
    });
    setCollections(getCollections());
    onCollectionsUpdated?.();
  };

  /** Bookmarkから外す（全コレクションからも削除） */
  const handleRemoveFromBookmark = () => {
    if (!cardId) return;
    removeBookmarkFully(cardId);
    setCollections(getCollections());
    onCollectionsUpdated?.();
    showAppToast("bookmarkを解除しました");
    onClose();
  };

  /** 行の上下余白：従来 min-h 52px 相当の内側余白 16px → 150% = 24px */
  const listRowClass =
    "flex w-full items-center justify-between px-5 py-6 text-left text-[#191919] transition-colors active:bg-gray-50";

  return (
    <>
      <BookmarkModalShell
        onComplete={handleComplete}
        footer={
          <>
            <Button variant="outline" className="w-full" onClick={() => setShowSettingsModal(true)}>
              新しいコミュニティを追加
            </Button>
            {bookmarked ? (
              <button
                type="button"
                className="mx-auto flex min-h-[44px] w-full max-w-[280px] items-center justify-center gap-2 rounded-full border border-[#DADADA] bg-white px-6 text-sm font-bold text-[#191919] active:bg-gray-50"
                onClick={handleRemoveFromBookmark}
              >
                <img
                  src="/icons/remove_bookmark.svg"
                  alt=""
                  className="h-[17px] w-5 shrink-0 object-contain"
                  width={20}
                  height={17}
                />
                Bookmark削除
              </button>
            ) : null}
          </>
        }
      >
        <ul>
          <li>
            <button type="button" className={listRowClass} onClick={handleSelectAll}>
              <span className="text-sm font-bold">ALL</span>
              <CollectionToggleIcon selected={isInAll} />
            </button>
          </li>
        </ul>

        <BookmarkModalDivider />

        <div className="bg-[#F5F5F5] px-5 py-2">
          <span className="text-xs font-bold text-[#787878]">コミュニティ</span>
        </div>

        <ul className="divide-y divide-[#DADADA]">
          {manageableCollections.map((col) => (
            <li key={col.id}>
              <button
                type="button"
                className={listRowClass}
                onClick={() => handleToggle(col.id)}
              >
                <span className="min-w-0 flex-1 truncate pr-3 text-sm font-bold">{col.name}</span>
                <CollectionToggleIcon selected={isInCollection(col)} />
              </button>
            </li>
          ))}
        </ul>
      </BookmarkModalShell>

      {showSettingsModal ? (
        <CollectionSettingsModal
          onClose={() => setShowSettingsModal(false)}
          onSave={handleSaveNewCollection}
        />
      ) : null}
    </>
  );
}
