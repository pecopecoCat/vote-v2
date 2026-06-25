"use client";

import { startTransition, useEffect, useState } from "react";
import { fetchCollectionsIndex, type CollectionsIndexRow } from "../lib/fetchCollectionsIndex";

/** 検索・HOME・コレクション一覧：KV index をマウント時に1回 warm（キャッシュ・in-flight 重複排除あり） */
export function useSearchCollectionsWarm(): {
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
    return () => {
      cancelled = true;
    };
  }, []);

  return { remotePopularCollections, collectionsIndexLoading };
}
