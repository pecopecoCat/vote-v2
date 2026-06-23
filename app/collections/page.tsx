"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import AppHeader from "../components/AppHeader";
import CollectionCard from "../components/CollectionCard";
import { getOtherUsersCollections, isCollectionPinnable } from "../data/collections";
import type { CollectionGradient } from "../data/search";
import { useAuthState } from "../hooks/useAuthState";
import { useEnsureCollectionsHydrated } from "../hooks/useEnsureCollectionsHydrated";
import { useLocalCollections } from "../hooks/useLocalCollections";
import { useSearchCollectionsWarm } from "../hooks/useSearchCollectionsWarm";
import { sortCollectionsByPinned } from "../lib/sortCollectionsByPinned";

const LIST_GRADIENTS: CollectionGradient[] = [
  "blue-cyan",
  "pink-purple",
  "purple-pink",
  "orange-yellow",
  "green-yellow",
  "cyan-aqua",
];

const INITIAL_VISIBLE = 8;
const LOAD_MORE = 8;

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
  const { collections, pinnedCollectionIds, refreshCollections } = useLocalCollections();
  useEnsureCollectionsHydrated();
  const { remotePopularCollections, collectionsIndexLoading } = useSearchCollectionsWarm(
    isLoggedIn,
    "community",
    refreshCollections
  );
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE);
  const loadSentinelRef = useRef<HTMLDivElement | null>(null);

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

  const displayedCollections = useMemo(
    () => collectionsForList.slice(0, visibleCount),
    [collectionsForList, visibleCount]
  );

  useEffect(() => {
    const root = loadSentinelRef.current;
    if (!root) return;
    if (collectionsForList.length <= visibleCount) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleCount((prev) => Math.min(prev + LOAD_MORE, collectionsForList.length));
        }
      },
      { root: null, rootMargin: "280px 0px", threshold: 0 }
    );
    obs.observe(root);
    return () => obs.disconnect();
  }, [collectionsForList.length, visibleCount]);

  return (
    <div className="min-h-screen bg-[#F1F1F1] pb-[50px]">
      <AppHeader type="title" title="コレクション一覧" backHref="/" />
      <main className="collections-list-main mx-auto px-[5.333vw] pt-4 sm:px-6">
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
          <section className="collections-list-grid">
            {displayedCollections.map((col, i) => (
              <CollectionCard
                key={col.id}
                id={col.id}
                title={col.name}
                gradient={col.gradient ?? LIST_GRADIENTS[i % LIST_GRADIENTS.length]}
                showPin={
                  isCollectionPinnable(col.visibility) && pinnedCollectionIds.includes(col.id)
                }
                listPage
                href={`/collection/${col.id}`}
              />
            ))}
            {collectionsForList.length > displayedCollections.length ? (
              <div ref={loadSentinelRef} className="collections-list-grid__sentinel h-8" aria-hidden />
            ) : null}
          </section>
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
