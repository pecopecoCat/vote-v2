"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  getCollections,
  toggleCardInCollection,
  createOwnedCollectionFromSettings,
  getCollectionsUpdatedEventName,
  type Collection,
} from "../data/collections";
import { type CollectionGradient } from "../data/search";
import { useSharedData } from "../context/SharedDataContext";
import { showAppToast } from "../lib/appToast";
import Button from "./Button";
import CollectionSettingsModal from "./CollectionSettingsModal";

interface AddToCommunityModalProps {
  cardId: string | null;
  onClose: () => void;
  isLoggedIn?: boolean;
  onCollectionsUpdated?: () => void;
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

export default function AddToCommunityModal({
  cardId,
  onClose,
  isLoggedIn = false,
  onCollectionsUpdated,
}: AddToCommunityModalProps) {
  const shared = useSharedData();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  useEffect(() => {
    if (isLoggedIn) void shared.ensureCollectionsHydrated();
  }, [isLoggedIn, shared.ensureCollectionsHydrated]);

  useEffect(() => {
    if (isLoggedIn) setCollections(getCollections());
  }, [cardId, isLoggedIn]);

  useEffect(() => {
    const eventName = getCollectionsUpdatedEventName();
    const handler = () => {
      setCollections(getCollections());
      onCollectionsUpdated?.();
    };
    window.addEventListener(eventName, handler);
    return () => window.removeEventListener(eventName, handler);
  }, [onCollectionsUpdated]);

  const handleToggle = useCallback(
    (collectionId: string) => {
      if (!cardId) return;
      const col = collections.find((c) => c.id === collectionId);
      const wasIn = col?.cardIds.includes(cardId) ?? false;
      toggleCardInCollection(collectionId, cardId);
      setCollections(getCollections());
      onCollectionsUpdated?.();
      showAppToast(wasIn ? "コレクションから外しました" : "コレクションに追加しました");
    },
    [cardId, collections, onCollectionsUpdated]
  );

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
    showAppToast("コレクションに追加しました");
  };

  if (cardId == null) return null;

  if (!isLoggedIn) {
    return (
      <>
        <div className="fixed inset-0 z-[60] bg-black/50" aria-hidden onClick={onClose} />
        <div
          className="fixed inset-x-0 bottom-0 z-[70] rounded-t-[30px] bg-white px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] pt-8 shadow-lg"
          role="dialog"
          aria-labelledby="add-to-community-title"
        >
          <p id="add-to-community-title" className="text-center text-sm font-bold text-[#191919]">
            コレクションに追加するには
            <br />
            ログインしてください。
          </p>
          <Link
            href={`/profile/login?returnTo=${encodeURIComponent(typeof window !== "undefined" ? window.location.pathname + window.location.search : "/")}`}
            className="mt-4 block rounded-[10px] bg-[#191919] px-6 py-3 text-center text-sm font-bold text-white hover:opacity-90"
            onClick={onClose}
          >
            ログインする
          </Link>
        </div>
      </>
    );
  }

  const manageableCollections = collections.filter((c) => !c.joinedParticipation);
  const listRowClass =
    "flex w-full items-center justify-between px-5 py-5 text-left text-[#191919] transition-colors active:bg-gray-50";

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/50" aria-hidden onClick={onClose} />
      <div
        className="fixed inset-x-0 bottom-0 z-[70] flex max-h-[85vh] flex-col overflow-hidden rounded-t-[30px] bg-white shadow-lg"
        role="dialog"
        aria-labelledby="add-to-community-title"
      >
        <div className="grid shrink-0 grid-cols-[1fr_auto_1fr] items-center border-b border-[#DADADA] px-5 py-3">
          <div />
          <h2 id="add-to-community-title" className="text-lg font-bold text-[#191919]">
            コレクションに追加
          </h2>
          <div className="flex justify-end">
            <button
              type="button"
              className="text-sm font-bold text-[#0779F1]"
              aria-label="完了"
              onClick={onClose}
            >
              完了
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {manageableCollections.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-gray-500">
              コレクションがありません。下のボタンから作成できます。
            </p>
          ) : (
            <ul className="divide-y divide-[#DADADA]">
              {manageableCollections.map((col) => (
                <li key={col.id}>
                  <button
                    type="button"
                    className={listRowClass}
                    onClick={() => handleToggle(col.id)}
                  >
                    <span className="min-w-0 flex-1 truncate pr-3 text-sm font-bold">{col.name}</span>
                    <CollectionToggleIcon selected={col.cardIds.includes(cardId)} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="shrink-0 border-t border-[#DADADA] px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] pt-4">
          <Button variant="outline" className="w-full" onClick={() => setShowSettingsModal(true)}>
            新しいコレクションを追加
          </Button>
        </div>
      </div>

      {showSettingsModal ? (
        <CollectionSettingsModal
          onClose={() => setShowSettingsModal(false)}
          onSave={handleSaveNewCollection}
        />
      ) : null}
    </>
  );
}
