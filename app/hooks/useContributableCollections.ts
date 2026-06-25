"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";
import { getCollections } from "../data/collections";
import { getCurrentActivityUserId } from "../data/auth";
import {
  buildContributableCollections,
  filterContributableByQuery,
  filterContributableForPicker,
  groupContributableForPicker,
  isCardInContributableCollection,
  type ContributableCollection,
} from "../lib/contributableCollections";
import {
  bumpContributableRemote,
  ensureContributableCollectionsBootstrapped,
  getContributableCollectionsServerSnapshot,
  getContributableCollectionsSnapshot,
  refreshContributableRemote,
  subscribeContributableCollections,
} from "../lib/contributableCollectionsStore";
import { useSharedData } from "../context/SharedDataContext";

type UseContributableCollectionsOptions = {
  /** false のとき fetch せず空配列（ラベル表示など必要時だけ true） */
  enabled?: boolean;
};

export function useContributableCollections(
  cardId?: string,
  options?: UseContributableCollectionsOptions
) {
  const enabled = options?.enabled ?? true;
  const shared = useSharedData();
  const snapshot = useSyncExternalStore(
    subscribeContributableCollections,
    getContributableCollectionsSnapshot,
    getContributableCollectionsServerSnapshot
  );
  const activityUserId = getCurrentActivityUserId();

  useEffect(() => {
    if (!enabled) return;
    void shared.ensureCollectionsHydrated();
    ensureContributableCollectionsBootstrapped();
  }, [enabled, shared.ensureCollectionsHydrated]);

  const rows = useMemo(() => {
    if (!enabled) return [];
    const owned = getCollections();
    return buildContributableCollections(owned, snapshot.remoteRows, activityUserId, cardId);
  }, [enabled, snapshot.remoteRows, snapshot.ownedVersion, activityUserId, cardId]);

  return {
    rows,
    loading: enabled && snapshot.loading,
    bumpAfterRemoteMutation: bumpContributableRemote,
    refreshRemote: () => refreshContributableRemote(true),
  };
}

export function useGroupedContributableRows(rows: ContributableCollection[], query: string) {
  return useMemo(() => {
    const pickable = filterContributableForPicker(rows);
    const filtered = filterContributableByQuery(pickable, query);
    return groupContributableForPicker(filtered);
  }, [rows, query]);
}

export { isCardInContributableCollection };
