"use client";

import { Suspense, useCallback, useMemo, useState } from "react";
import AppHeader from "../components/AppHeader";
import CollectionListTile from "../components/CollectionListTile";
import CollectionOptionsModal from "../components/CollectionOptionsModal";
import CollectionSettingsModal from "../components/CollectionSettingsModal";
import { groupCollectionsForListPage } from "../data/collectionCategories";
import {
  deleteCollection,
  getOtherUsersCollections,
  isCollectionPinnable,
  togglePinnedCollection,
  updateCollection,
  type Collection,
} from "../data/collections";
import { getCurrentActivityUserId } from "../data/auth";
import type { CollectionGradient } from "../data/search";
import { useSharedData } from "../context/SharedDataContext";
import { useAuthState } from "../hooks/useAuthState";
import { useEnsureCollectionsHydrated } from "../hooks/useEnsureCollectionsHydrated";
import { useLocalCollections } from "../hooks/useLocalCollections";
import { useSearchCollectionsWarm } from "../hooks/useSearchCollectionsWarm";
import { getCollectionThumbnailUrl } from "../lib/getCollectionThumbnailUrl";
import { sortCollectionsByPinned } from "../lib/sortCollectionsByPinned";

function CollectionsLoading() {
  return (
    <div className="min-h-screen bg-[#F1F1F1] pb-[50px]">
      <AppHeader type="title" title="コレクション一覧" backHref="/" />
      <main className="collections-list-main mx-auto px-[5.333vw] pb-[50px] pt-4">
        <p className="py-6 text-center text-sm text-gray-500" role="status">
          読み込み中…
        </p>
      </main>
    </div>
  );
}

function isOwnedCollection(
  collection: Collection,
  activityUserId: string,
  localCollections: Collection[]
): boolean {
  const local = localCollections.find((c) => c.id === collection.id);
  if (local && !local.joinedParticipation) return true;
  return Boolean(collection.createdByUserId === activityUserId && !collection.joinedParticipation);
}

function CollectionsContent() {
  const auth = useAuthState();
  const isLoggedIn = auth.isLoggedIn;
  const activityUserId = getCurrentActivityUserId();
  const { collections, pinnedCollectionIds, refreshCollections } = useLocalCollections();
  const { createdVotesForTimeline } = useSharedData();
  useEnsureCollectionsHydrated();
  const { remotePopularCollections, collectionsIndexLoading } = useSearchCollectionsWarm(
    isLoggedIn,
    "community",
    refreshCollections
  );

  const [menuCollectionId, setMenuCollectionId] = useState<string | null>(null);
  const [editingCollection, setEditingCollection] = useState<Collection | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  const collectionsForList = useMemo(() => {
    const remotePublic = remotePopularCollections
      .filter((c) => c.visibility === "public")
      .map((c) => ({
        id: c.id,
        name: c.name,
        color: c.color,
        gradient: c.gradient as CollectionGradient | undefined,
        visibility: "public" as const,
        cardIds: c.cardIds,
        category: c.category,
        coverImageUrl: c.coverImageUrl,
        createdByUserId: c.createdByUserId,
        createdByDisplayName: c.createdByDisplayName,
        createdByIconUrl: c.createdByIconUrl,
      }));
    const other = getOtherUsersCollections();
    const mine = collections.filter((c) => c.visibility !== "member");
    const seen = new Set<string>();
    const combined = [...remotePublic, ...other, ...mine].filter((c) => {
      if (!c?.id) return false;
      if (seen.has(c.id)) return false;
      seen.add(c.id);
      return true;
    });
    return sortCollectionsByPinned(combined, pinnedCollectionIds);
  }, [collections, pinnedCollectionIds, remotePopularCollections]);

  const sections = useMemo(
    () => groupCollectionsForListPage(collectionsForList, pinnedCollectionIds),
    [collectionsForList, pinnedCollectionIds]
  );

  const thumbnailById = useMemo(() => {
    const map = new Map<string, string | null>();
    for (const col of collectionsForList) {
      map.set(col.id, getCollectionThumbnailUrl(col, createdVotesForTimeline));
    }
    return map;
  }, [collectionsForList, createdVotesForTimeline]);

  const menuCollection = useMemo(
    () => (menuCollectionId ? collectionsForList.find((c) => c.id === menuCollectionId) ?? null : null),
    [collectionsForList, menuCollectionId]
  );

  const handlePinToggle = useCallback(
    (collectionId: string) => {
      togglePinnedCollection(collectionId);
      refreshCollections();
    },
    [refreshCollections]
  );

  const openSettings = useCallback((col: Collection) => {
    setMenuCollectionId(null);
    setEditingCollection(col);
    setShowSettings(true);
  }, []);

  const handleDeleteCollection = useCallback(() => {
    if (!menuCollection) return;
    deleteCollection(menuCollection.id);
    refreshCollections();
    setMenuCollectionId(null);
  }, [menuCollection, refreshCollections]);

  return (
    <div className="min-h-screen bg-[#F1F1F1] pb-[50px]">
      <AppHeader type="title" title="コレクション一覧" backHref="/" />
      <main className="collections-list-main mx-auto px-[5.333vw] pb-[50px] pt-5 sm:px-6">
        {collectionsIndexLoading && remotePopularCollections.length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-500" role="status" aria-live="polite">
            コレクションを読み込み中…
          </p>
        ) : collectionsForList.length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-500">
            {isLoggedIn
              ? "コレクションがありません。マイページで作成しよう。"
              : "コレクションはありません。"}
          </p>
        ) : (
          <div className="flex flex-col gap-6">
            {sections.map((section) => (
              <section key={section.id} className="collections-category-section">
                <h2 className="collections-category-title">{section.title}</h2>
                <div className="collections-category-row">
                  {section.collections.map((col) => {
                    const canPin = isCollectionPinnable(col.visibility);
                    const owned = isOwnedCollection(col, activityUserId, collections);
                    return (
                      <CollectionListTile
                        key={`${section.id}-${col.id}`}
                        collection={col}
                        thumbnailUrl={thumbnailById.get(col.id)}
                        href={`/collection/${col.id}`}
                        canPin={canPin}
                        isPinned={canPin && pinnedCollectionIds.includes(col.id)}
                        showMenu={owned}
                        onPinToggle={() => handlePinToggle(col.id)}
                        onMenuClick={() => setMenuCollectionId(col.id)}
                      />
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>

      {menuCollection ? (
        <CollectionOptionsModal
          onClose={() => setMenuCollectionId(null)}
          onEdit={() => openSettings(menuCollection)}
          onDelete={handleDeleteCollection}
        />
      ) : null}

      {showSettings ? (
        <CollectionSettingsModal
          editingCollection={editingCollection}
          onClose={() => {
            setShowSettings(false);
            setEditingCollection(null);
          }}
          onSave={async (name, gradient, visibility, category, coverImageUrl) => {
            if (editingCollection) {
              updateCollection(editingCollection.id, { name, gradient, visibility, category, coverImageUrl });
              refreshCollections();
            }
            setShowSettings(false);
            setEditingCollection(null);
          }}
        />
      ) : null}
    </div>
  );
}

export default function CollectionsPage() {
  return (
    <Suspense fallback={<CollectionsLoading />}>
      <CollectionsContent />
    </Suspense>
  );
}
