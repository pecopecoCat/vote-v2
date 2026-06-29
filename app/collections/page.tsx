"use client";

import { Suspense, useCallback, useMemo } from "react";
import AppHeader from "../components/AppHeader";
import CollectionTilesRow from "../components/CollectionTilesRow";
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
  const { remotePopularCollections, collectionsIndexLoading } = useSearchCollectionsWarm();

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
    return combined;
  }, [collections, pinnedCollectionIds, remotePopularCollections]);

  const { pinnedCollections, unpinnedCollections } = useMemo(() => {
    const pinnedSet = new Set(pinnedCollectionIds);
    const pinned = pinnedCollectionIds
      .map((id) => collectionsForList.find((c) => c.id === id))
      .filter((c): c is Collection => c != null);
    const unpinned = collectionsForList.filter((c) => !pinnedSet.has(c.id));
    return { pinnedCollections: pinned, unpinnedCollections: unpinned };
  }, [collectionsForList, pinnedCollectionIds]);

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
      coverImageUrl?: string
    ) => {
      if (!editing) return;
      updateCollection(editing.id, { name, gradient, visibility, coverImageUrl });
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
          <div className="flex flex-col gap-8">
            {pinnedCollections.length > 0 ? (
              <section className="collections-list-section">
                <h2 className="collections-list-section-title">ピン留め</h2>
                <CollectionTilesRow
                  collections={pinnedCollections}
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
            ) : null}
            {unpinnedCollections.length > 0 ? (
              <section className="collections-list-section">
                <CollectionTilesRow
                  collections={unpinnedCollections}
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
            ) : null}
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
