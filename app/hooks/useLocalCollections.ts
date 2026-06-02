"use client";

import { useCallback, useState, type Dispatch, type SetStateAction } from "react";
import {
  getCollections,
  getCollectionsUpdatedEventName,
  getPinnedCollectionIds,
  PINNED_UPDATED_EVENT,
  type Collection,
} from "../data/collections";
import { useWindowCustomEvent } from "./useWindowCustomEvent";

export function useLocalCollections(): {
  collections: Collection[];
  setCollections: Dispatch<SetStateAction<Collection[]>>;
  pinnedCollectionIds: string[];
  refreshCollections: () => void;
} {
  const [collections, setCollections] = useState<Collection[]>(() => getCollections());
  const [pinnedCollectionIds, setPinnedCollectionIds] = useState<string[]>(() =>
    getPinnedCollectionIds()
  );
  const refreshCollections = useCallback(() => {
    setCollections(getCollections());
    setPinnedCollectionIds(getPinnedCollectionIds());
  }, []);
  useWindowCustomEvent(getCollectionsUpdatedEventName(), refreshCollections);
  useWindowCustomEvent(PINNED_UPDATED_EVENT, refreshCollections);
  return { collections, setCollections, pinnedCollectionIds, refreshCollections };
}
