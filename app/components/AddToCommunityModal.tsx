"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  createOwnedCollectionFromSettings,
  getCollectionsUpdatedEventName,
  toggleCardInContributableCollection,
} from "../data/collections";
import type { CollectionCategory } from "../data/collectionCategories";
import { type CollectionGradient } from "../data/search";
import { useSharedData } from "../context/SharedDataContext";
import { showAppToast } from "../lib/appToast";
import { isCardInContributableCollection } from "../hooks/useContributableCollections";
import type { ContributableCollection } from "../lib/contributableCollections";
import { bumpContributableRemote } from "../lib/contributableCollectionsStore";
import CollectionSettingsModal from "./CollectionSettingsModal";
import { CollectionPickerBody, CollectionPickerScreen } from "./CollectionPickerSheet";

interface AddToCommunityModalProps {
  cardId: string | null;
  onClose: () => void;
  isLoggedIn?: boolean;
  onCollectionsUpdated?: () => void;
}

export default function AddToCommunityModal({
  cardId,
  onClose,
  isLoggedIn = false,
  onCollectionsUpdated,
}: AddToCommunityModalProps) {
  const shared = useSharedData();
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  useEffect(() => {
    if (isLoggedIn) void shared.ensureCollectionsHydrated();
  }, [isLoggedIn, shared.ensureCollectionsHydrated]);

  useEffect(() => {
    const eventName = getCollectionsUpdatedEventName();
    const handler = () => onCollectionsUpdated?.();
    window.addEventListener(eventName, handler);
    return () => window.removeEventListener(eventName, handler);
  }, [onCollectionsUpdated]);

  const handleRowToggle = useCallback(
    async (row: ContributableCollection) => {
      if (!cardId) return;
      const containsCard = isCardInContributableCollection(row, cardId);
      const wasIn = containsCard;
      const ok = await toggleCardInContributableCollection(row.id, cardId, {
        isOwned: row.isOwned,
        containsCard,
        canAdd: row.canAdd,
        canRemove: row.canRemove,
      });
      if (!ok) return;
      if (!row.isOwned) {
        bumpContributableRemote();
      }
      onCollectionsUpdated?.();
      showAppToast(wasIn ? "コレクションから外しました" : "コレクションに追加しました");
    },
    [cardId, onCollectionsUpdated]
  );

  const handleSaveNewCollection = async (
    name: string,
    gradient: CollectionGradient,
    visibility: "public" | "private" | "member",
    category: CollectionCategory,
    coverImageUrl?: string
  ) => {
    await createOwnedCollectionFromSettings(name, {
      gradient,
      visibility,
      category,
      coverImageUrl,
      cardId: cardId ?? undefined,
    });
    onCollectionsUpdated?.();
    setShowSettingsModal(false);
    showAppToast("コレクションに追加しました");
  };

  if (cardId == null) return null;

  if (!isLoggedIn) {
    return (
      <CollectionPickerScreen open onClose={onClose} title="コレクションに追加">
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-5 py-10 text-center">
          <p className="text-sm font-bold text-[#191919]">
            コレクションに追加するには
            <br />
            ログインしてください。
          </p>
          <Link
            href={`/profile/login?returnTo=${encodeURIComponent(typeof window !== "undefined" ? window.location.pathname + window.location.search : "/")}`}
            className="rounded-[10px] bg-[#191919] px-6 py-3 text-center text-sm font-bold text-white hover:opacity-90"
            onClick={onClose}
          >
            ログインする
          </Link>
        </div>
      </CollectionPickerScreen>
    );
  }

  return (
    <>
      <CollectionPickerScreen open onClose={onClose} title="コレクションに追加">
        <CollectionPickerBody
          mode="toggle"
          cardId={cardId}
          selectedIds={[]}
          onRowToggle={handleRowToggle}
          onCreateNew={() => setShowSettingsModal(true)}
        />
      </CollectionPickerScreen>

      {showSettingsModal ? (
        <CollectionSettingsModal
          onClose={() => setShowSettingsModal(false)}
          onSave={handleSaveNewCollection}
        />
      ) : null}
    </>
  );
}
