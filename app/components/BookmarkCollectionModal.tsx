"use client";

import Link from "next/link";
import {
  getCollections,
  toggleCardInCollection,
  removeCardFromCollection,
  createCollection,
  getCollectionsUpdatedEventName,
  type Collection,
} from "../data/collections";
import {
  addBookmark,
  removeBookmark,
  isCardBookmarked,
  getBookmarksUpdatedEventName,
} from "../data/bookmarks";
import { getCollectionGradientStyle, type CollectionGradient } from "../data/search";
import { useEffect, useState } from "react";
import Button from "./Button";
import CollectionSettingsModal from "./CollectionSettingsModal";

interface BookmarkCollectionModalProps {
  cardId: string | null;
  onClose: () => void;
  onCollectionsUpdated?: () => void;
  /** 関係図: コレクションはログイン後のユーザーが作る。未ログイン時はログイン促進を表示 */
  isLoggedIn?: boolean;
}

export default function BookmarkCollectionModal({
  cardId,
  onClose,
  onCollectionsUpdated,
  isLoggedIn = false,
}: BookmarkCollectionModalProps) {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  useEffect(() => {
    if (isLoggedIn) setCollections(getCollections());
  }, [cardId, isLoggedIn]);

  /** モーダルを開いた＝Bookmarkに登録（まとめはコレクションで） */
  useEffect(() => {
    if (isLoggedIn && cardId) addBookmark(cardId);
  }, [isLoggedIn, cardId]);

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

  const handleSaveNewCollection = (name: string, gradient: CollectionGradient, visibility: "public" | "private" | "member") => {
    createCollection(name, { gradient, visibility });
    setCollections(getCollections());
    onCollectionsUpdated?.();
    setShowSettingsModal(false);
  };

  if (cardId == null) return null;

  /** 関係図: ログイン後のユーザーがコレクションを作成・管理。未ログイン時はログイン促進 */
  if (!isLoggedIn) {
    return (
      <>
        <div className="fixed inset-0 z-40 bg-black/50" aria-hidden onClick={onClose} />
        <div className="fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-hidden rounded-t-[30px] bg-white shadow-lg">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center border-b border-gray-100 px-5 py-3">
            <div />
            <span className="text-lg font-bold text-gray-900">Bookmark</span>
            <div className="flex justify-end">
              <button type="button" className="flex h-10 items-center justify-center px-2 text-blue-600 text-sm font-medium" aria-label="完了" onClick={onClose}>
                完了
              </button>
            </div>
          </div>
          <div className="flex flex-col items-center justify-center gap-4 px-5 py-10 text-center">
            <p className="text-sm text-gray-700">
              ブックマーク・コレクションを使うには
              <br />
              ログインしてください。
            </p>
            <Link
              href="/profile/login"
              className="rounded-xl bg-gray-900 px-6 py-3 text-center text-sm font-bold text-white hover:opacity-90"
              onClick={onClose}
            >
              ログインする
            </Link>
          </div>
        </div>
      </>
    );
  }

  const isInCollection = (c: Collection) => c.cardIds.includes(cardId);
  /** ALL＝どのコレクションにも入れない（Bookmarkには残る） */
  const isInAll = !collections.some((c) => c.cardIds.includes(cardId));
  const bookmarked = isCardBookmarked(cardId);

  const handleSelectAll = () => {
    if (!cardId) return;
    collections.forEach((col) => {
      if (col.cardIds.includes(cardId)) removeCardFromCollection(col.id, cardId);
    });
    setCollections(getCollections());
    onCollectionsUpdated?.();
  };

  /** Bookmarkから外す（全コレクションからも削除） */
  const handleRemoveFromBookmark = () => {
    if (!cardId) return;
    collections.forEach((col) => {
      if (col.cardIds.includes(cardId)) removeCardFromCollection(col.id, cardId);
    });
    removeBookmark(cardId);
    setCollections(getCollections());
    onCollectionsUpdated?.();
    onClose();
  };

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/50"
        aria-hidden
        onClick={onClose}
      />
      <div className="fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-hidden rounded-t-[30px] bg-white shadow-lg">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center border-b border-gray-100 px-5 py-3">
          <div />
          <span className="text-lg font-bold text-gray-900">Bookmark</span>
          <div className="flex justify-end">
            <button
              type="button"
              className="flex h-10 items-center justify-center px-2 text-blue-600 text-sm font-medium"
              aria-label="完了"
              onClick={onClose}
            >
              完了
            </button>
          </div>
        </div>
        <div className="max-h-[calc(85vh-120px)] overflow-y-auto px-5">
          <p className="py-2 text-xs text-gray-500">
            Bookmarkに登録済み。まとめたいものをコレクションに追加できます。
          </p>
          {/* ALL（どのコレクションにも入れない＝ALLリストにだけ表示） */}
          <ul className="divide-y divide-gray-100">
            <li>
              <button
                type="button"
                className="flex w-full items-center justify-between py-3 text-left text-gray-900"
                onClick={handleSelectAll}
              >
                <span className="text-sm font-medium">ALL</span>
                {isInAll ? (
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#FFE100]" aria-hidden>
                    <svg className="h-3.5 w-3.5" fill="#191919" viewBox="0 0 24 24">
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                    </svg>
                  </span>
                ) : (
                  <span className="flex h-[20px] w-[20px] shrink-0 items-center justify-center rounded-full bg-gray-200" aria-hidden>
                    <img src="/icons/icon_plus.svg" alt="" className="h-[10px] w-[10px]" width={10} height={10} />
                  </span>
                )}
              </button>
            </li>
          </ul>
          {/* コレクション一覧 */}
          <div className="border-b border-gray-100 bg-gray-50 px-0 py-2">
            <span className="text-sm font-medium text-gray-600">コレクション</span>
          </div>
          <ul className="divide-y divide-gray-100">
            {collections.map((col) => (
              <li key={col.id}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between py-3 text-left text-gray-900"
                  onClick={() => handleToggle(col.id)}
                >
                  <span className="flex items-center gap-2">
                    <span
                      className="h-8 w-8 shrink-0 rounded-full"
                      style={getCollectionGradientStyle(col.gradient, col.color)}
                    />
                    <span className="text-sm font-medium">{col.name}</span>
                  </span>
                  {isInCollection(col) ? (
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#FFE100]" aria-hidden>
                      <svg className="h-3.5 w-3.5" fill="#191919" viewBox="0 0 24 24">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                      </svg>
                    </span>
                  ) : (
                    <span className="flex h-[20px] w-[20px] shrink-0 items-center justify-center rounded-full bg-gray-200" aria-hidden>
                      <img src="/icons/icon_plus.svg" alt="" className="h-[10px] w-[10px]" width={10} height={10} />
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div className="border-t border-gray-100 p-5 space-y-2">
          <Button variant="outline" className="w-full" onClick={() => setShowSettingsModal(true)}>
            新しいコレクションを追加
          </Button>
          {bookmarked && (
            <button
              type="button"
              className="w-full py-2.5 text-sm font-medium text-gray-500 hover:text-gray-700"
              onClick={handleRemoveFromBookmark}
            >
              Bookmarkから外す
            </button>
          )}
        </div>
      </div>

      {showSettingsModal && (
        <CollectionSettingsModal
          onClose={() => setShowSettingsModal(false)}
          onSave={handleSaveNewCollection}
        />
      )}
    </>
  );
}
