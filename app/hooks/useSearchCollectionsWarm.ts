"use client";

import { startTransition, useEffect, useState } from "react";
import { hydrateUserOwnedCollectionsFromRemote } from "../data/collections";
import { fetchCollectionsIndex, type CollectionsIndexRow } from "../lib/fetchCollectionsIndex";

type SearchTabId = "trending" | "collections" | "favorite";

/** 検索画面：KV index の warm と（ログイン時）自分のコレ同期 */
export function useSearchCollectionsWarm(
  isLoggedIn: boolean,
  activeTab: SearchTabId,
  onOwnedCollectionsSynced?: () => void
): {
  remotePopularCollections: CollectionsIndexRow[];
  collectionsIndexLoading: boolean;
} {
  const [remotePopularCollections, setRemotePopularCollections] = useState<CollectionsIndexRow[]>(
    []
  );
  const [collectionsIndexLoading, setCollectionsIndexLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setCollectionsIndexLoading(true);
    void fetchCollectionsIndex()
      .then((rows) => {
        if (!cancelled) startTransition(() => setRemotePopularCollections(rows));
      })
      .finally(() => {
        if (!cancelled) setCollectionsIndexLoading(false);
      });
    if (isLoggedIn) {
      void hydrateUserOwnedCollectionsFromRemote().then(() => {
        if (!cancelled) onOwnedCollectionsSynced?.();
      });
    }
    return () => {
      cancelled = true;
    };
  }, [isLoggedIn, onOwnedCollectionsSynced]);

  useEffect(() => {
    if (activeTab !== "collections") return;
    let cancelled = false;
    void fetchCollectionsIndex().then((rows) => {
      if (!cancelled) startTransition(() => setRemotePopularCollections(rows));
    });
    return () => {
      cancelled = true;
    };
  }, [activeTab]);

  return { remotePopularCollections, collectionsIndexLoading };
}
