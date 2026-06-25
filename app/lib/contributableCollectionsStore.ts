import { getCollectionsUpdatedEventName } from "../data/collections";
import {
  fetchCollectionsIndex,
  invalidateCollectionsIndexCache,
  type CollectionsIndexRow,
} from "./fetchCollectionsIndex";

export type ContributableCollectionsSnapshot = {
  remoteRows: CollectionsIndexRow[];
  loading: boolean;
  ownedVersion: number;
};

let remoteRows: CollectionsIndexRow[] = [];
let loading = false;
let ownedVersion = 0;
let fetchPromise: Promise<void> | null = null;
let bootstrapped = false;
const listeners = new Set<() => void>();

const SERVER_SNAPSHOT: ContributableCollectionsSnapshot = {
  remoteRows: [],
  loading: false,
  ownedVersion: 0,
};

function emit(): void {
  listeners.forEach((listener) => listener());
}

function bumpOwned(): void {
  ownedVersion += 1;
  emit();
}

export function getContributableCollectionsSnapshot(): ContributableCollectionsSnapshot {
  return { remoteRows, loading, ownedVersion };
}

export function subscribeContributableCollections(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getContributableCollectionsServerSnapshot(): ContributableCollectionsSnapshot {
  return SERVER_SNAPSHOT;
}

export async function refreshContributableRemote(force = false): Promise<void> {
  if (fetchPromise) return fetchPromise;
  fetchPromise = (async () => {
    loading = true;
    emit();
    try {
      remoteRows = await fetchCollectionsIndex(force);
    } finally {
      loading = false;
      fetchPromise = null;
      emit();
    }
  })();
  return fetchPromise;
}

export function bumpContributableRemote(): void {
  invalidateCollectionsIndexCache();
  void refreshContributableRemote(true);
}

/** 初回のみ: ローカル更新イベント購読 + リモート index 取得（キャッシュ利用） */
export function ensureContributableCollectionsBootstrapped(): void {
  if (bootstrapped) return;
  bootstrapped = true;
  if (typeof window !== "undefined") {
    window.addEventListener(getCollectionsUpdatedEventName(), bumpOwned);
  }
  void refreshContributableRemote(false);
}
