import type { Collection } from "../data/collections";

/** 自分が作成したコレクション（参加中の他人コレは除外） */
export function isOwnedCollection(
  collection: Collection,
  activityUserId: string,
  localCollections: Collection[]
): boolean {
  const local = localCollections.find((c) => c.id === collection.id);
  if (local && !local.joinedParticipation) return true;
  return Boolean(
    collection.createdByUserId &&
      collection.createdByUserId === activityUserId &&
      !collection.joinedParticipation
  );
}

export type CollectionTileMenuFilter = "library" | "owned";

/**
 * - library: マイページ（ローカルに保存されているコレクションすべて）
 * - owned: コレクション一覧（自分が作ったコレクションのみ）
 */
export function shouldShowCollectionTileMenu(
  collection: Collection,
  activityUserId: string,
  localCollections: Collection[],
  filter: CollectionTileMenuFilter = "library"
): boolean {
  if (filter === "library") {
    if (localCollections.some((c) => c.id === collection.id)) return true;
    return isOwnedCollection(collection, activityUserId, localCollections);
  }
  return isOwnedCollection(collection, activityUserId, localCollections);
}

export function getCollectionMenuModalProps(collection: Collection | undefined) {
  return {
    showShare: collection?.visibility === "member",
    hideEdit: Boolean(collection?.joinedParticipation),
    deleteLabel: collection?.joinedParticipation
      ? "マイリストから削除"
      : "コレクションを削除",
  };
}

/** @deprecated use shouldShowCollectionTileMenu */
export function canShowCollectionTileMenu(
  collection: Collection,
  activityUserId: string,
  localCollections: Collection[]
): boolean {
  return shouldShowCollectionTileMenu(collection, activityUserId, localCollections, "library");
}
