"use client";

import { Suspense, useCallback, useMemo } from "react";
import AppHeader from "../components/AppHeader";
import CollectionTilesRow from "../components/CollectionTilesRow";
import { groupCollectionsForListPage } from "../data/collectionCategories";
import {
  getOtherUsersCollections,
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
    const ownedIds = new Set(
      collections.filter((c) => !c.joinedParticipation).map((c) => c.id)
    );
    const remoteFiltered = remotePublic.filter((c) => !ownedIds.has(c.id));
    const otherFiltered = other.filter((c) => !ownedIds.has(c.id));
    const seen = new Set<string>();
    const combined = [...mine, ...remoteFiltered, ...otherFiltered].filter((c) => {
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

  const handleSettingsSave = useCallback(
    async (
      editing: Collection | null,
      name: string,
      gradient: CollectionGradient,
      visibility: Collection["visibility"],
      category: Collection["category"],
      coverImageUrl?: string
    ) => {
      if (!editing) return;
      updateCollection(editing.id, { name, gradient, visibility, category, coverImageUrl });
      refreshCollections();
    },
    [refreshCollections]
  );

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
                <CollectionTilesRow
                  collections={section.collections}
                  thumbnailById={thumbnailById}
                  localCollections={collections}
                  activityUserId={activityUserId}
                  pinnedCollectionIds={pinnedCollectionIds}
                  menuFilter="owned"
                  showPin
                  onRefresh={refreshCollections}
                  onSettingsSave={handleSettingsSave}
                />
              </section>
            ))}
          </div>
        )}
      </main>
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
