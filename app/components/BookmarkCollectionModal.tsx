"use client";

import {
  getCollections,
  toggleCardInCollection,
  removeCardFromCollection,
  createCollection,
  getCollectionsUpdatedEventName,
  type Collection,
} from "../data/collections";
import { useEffect, useState } from "react";
import Button from "./Button";
import CollectionSettingsModal from "./CollectionSettingsModal";

interface BookmarkCollectionModalProps {
  cardId: string | null;
  onClose: () => void;
  onCollectionsUpdated?: () => void;
}

export default function BookmarkCollectionModal({
  cardId,
  onClose,
  onCollectionsUpdated,
}: BookmarkCollectionModalProps) {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  useEffect(() => {
    setCollections(getCollections());
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

  const handleToggle = (collectionId: string) => {
    if (!cardId) return;
    toggleCardInCollection(collectionId, cardId);
    setCollections(getCollections());
    onCollectionsUpdated?.();
  };

  const handleSaveNewCollection = (name: string, color: string, visibility: "public" | "private" | "member") => {
    createCollection(name, { color, visibility });
    setCollections(getCollections());
    onCollectionsUpdated?.();
    setShowSettingsModal(false);
  };

  if (cardId == null) return null;

  const isInCollection = (c: Collection) => c.cardIds.includes(cardId);
  /** ALL = どのコレクションにも含まれていない状態 */
  const isInAll = !collections.some((c) => c.cardIds.includes(cardId));

  const handleSelectAll = () => {
    if (!cardId) return;
    collections.forEach((col) => {
      if (col.cardIds.includes(cardId)) removeCardFromCollection(col.id, cardId);
    });
    setCollections(getCollections());
    onCollectionsUpdated?.();
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
              className="flex h-10 w-10 items-center justify-center text-blue-600"
              aria-label="閉じる"
              onClick={onClose}
            >
              <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
              </svg>
            </button>
          </div>
        </div>
        <div className="max-h-[calc(85vh-120px)] overflow-y-auto px-5">
          {/* ALL（コレクションに含まれない） */}
          <ul className="divide-y divide-gray-100">
            <li>
              <button
                type="button"
                className="flex w-full items-center justify-between py-3 text-left text-gray-900"
                onClick={handleSelectAll}
              >
                <span className="text-sm font-medium">ALL</span>
                {isInAll ? (
                  <span className="text-blue-600" aria-hidden>
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
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
                      style={{ backgroundColor: col.color }}
                    />
                    <span className="text-sm font-medium">{col.name}</span>
                  </span>
                  {isInCollection(col) ? (
                    <span className="text-blue-600" aria-hidden>
                      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
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
        <div className="border-t border-gray-100 p-5">
          <Button variant="outline" className="w-full" onClick={() => setShowSettingsModal(true)}>
            新しいコレクションを追加
          </Button>
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
