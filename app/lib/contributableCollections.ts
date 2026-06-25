import {
  getOtherUsersCollections,
  type Collection,
  type CollectionVisibility,
} from "../data/collections";
import { COLLECTION_CATEGORY_OPTIONS, type CollectionCategory } from "../data/collectionCategories";
import type { CollectionGradient } from "../data/search";
import type { CollectionsIndexRow } from "./fetchCollectionsIndex";
import { isCollectionVoteCardRemoveEnabled } from "./collectionVoteCardMutation";

export type ContributableCollection = {
  id: string;
  name: string;
  visibility: CollectionVisibility;
  createdByUserId?: string;
  createdByDisplayName?: string;
  cardIds: string[];
  gradient?: CollectionGradient;
  color?: string;
  coverImageUrl?: string;
  category?: CollectionCategory;
  /** 自分が作成したコレクション */
  isOwned: boolean;
  canAdd: boolean;
  canRemove: boolean;
  disabledReason?: string;
};

function normalizeSearchText(value: string): string {
  return value.trim().toLowerCase().normalize("NFKC");
}

function collectionToContributable(
  col: Pick<
    Collection,
    | "id"
    | "name"
    | "visibility"
    | "createdByUserId"
    | "createdByDisplayName"
    | "cardIds"
    | "gradient"
    | "color"
    | "coverImageUrl"
    | "category"
  >,
  activityUserId: string,
  opts: { isOwned: boolean; cardId?: string }
): ContributableCollection {
  const containsCard = opts.cardId ? col.cardIds.includes(opts.cardId) : false;
  const isOwner = opts.isOwned || col.createdByUserId === activityUserId;
  let canRemove = opts.isOwned || isOwner;
  if (containsCard && !isOwner && !opts.isOwned) canRemove = false;
  if (!isCollectionVoteCardRemoveEnabled()) canRemove = false;
  return {
    id: col.id,
    name: col.name,
    visibility: col.visibility,
    createdByUserId: col.createdByUserId ?? (opts.isOwned ? activityUserId : undefined),
    createdByDisplayName: col.createdByDisplayName,
    cardIds: col.cardIds,
    gradient: col.gradient,
    color: col.color,
    coverImageUrl: col.coverImageUrl,
    category: col.category,
    isOwned: opts.isOwned,
    canAdd: col.visibility === "public" || opts.isOwned,
    canRemove,
    disabledReason: col.visibility === "member" && !opts.isOwned ? "作成者のみ追加できます" : undefined,
  };
}

function indexRowToContributable(
  row: CollectionsIndexRow,
  activityUserId: string,
  cardId?: string
): ContributableCollection {
  const isOwner = Boolean(row.createdByUserId && row.createdByUserId === activityUserId);
  const containsCard = cardId ? row.cardIds.includes(cardId) : false;
  let canRemove = isOwner;
  if (containsCard && !isOwner) canRemove = false;
  if (!isCollectionVoteCardRemoveEnabled()) canRemove = false;
  return {
    id: row.id,
    name: row.name,
    visibility: row.visibility === "member" ? "member" : row.visibility === "private" ? "private" : "public",
    createdByUserId: row.createdByUserId,
    createdByDisplayName: row.createdByDisplayName,
    cardIds: row.cardIds,
    gradient: row.gradient as CollectionGradient | undefined,
    color: row.color,
    coverImageUrl: row.coverImageUrl,
    category: row.category,
    isOwned: isOwner,
    canAdd: row.visibility === "public",
    canRemove,
    disabledReason: undefined,
  };
}

export function buildContributableCollections(
  ownedCollections: Collection[],
  remoteRows: CollectionsIndexRow[],
  activityUserId: string,
  cardId?: string
): ContributableCollection[] {
  const owned = ownedCollections.filter((c) => !c.joinedParticipation);
  const ownedIds = new Set(owned.map((c) => c.id));

  const ownedRows = owned.map((col) =>
    collectionToContributable(col, activityUserId, { isOwned: true, cardId })
  );

  const publicById = new Map<string, ContributableCollection>();

  for (const row of remoteRows) {
    if (row.visibility !== "public" || ownedIds.has(row.id)) continue;
    publicById.set(row.id, indexRowToContributable(row, activityUserId, cardId));
  }

  for (const col of getOtherUsersCollections()) {
    if (col.visibility !== "public" || ownedIds.has(col.id) || publicById.has(col.id)) continue;
    publicById.set(
      col.id,
      collectionToContributable(col, activityUserId, { isOwned: false, cardId })
    );
  }

  return [...ownedRows, ...publicById.values()];
}

/** ピッカー表示用：自分のコレクション＋他人の公開コレ（自分を先頭） */
export function filterContributableForPicker(rows: ContributableCollection[]): ContributableCollection[] {
  return rows.filter((r) => r.isOwned || r.visibility === "public");
}

export function matchesContributableQuery(row: ContributableCollection, rawQuery: string): boolean {
  const q = normalizeSearchText(rawQuery);
  if (!q) return true;
  const categoryLabel =
    COLLECTION_CATEGORY_OPTIONS.find((c) => c.id === row.category)?.label ?? "";
  const tokens = [row.name, categoryLabel, row.category ?? ""].map(normalizeSearchText);
  return tokens.some((token) => token.length > 0 && token.includes(q));
}

export function filterContributableByQuery(
  rows: ContributableCollection[],
  query: string
): ContributableCollection[] {
  if (!query.trim()) return rows;
  return rows.filter((row) => matchesContributableQuery(row, query));
}

export function groupContributableForPicker(rows: ContributableCollection[]): {
  owned: ContributableCollection[];
  public: ContributableCollection[];
} {
  return {
    owned: rows.filter((r) => r.isOwned),
    public: rows.filter((r) => !r.isOwned),
  };
}

export function isCardInContributableCollection(
  row: ContributableCollection,
  cardId: string
): boolean {
  return row.cardIds.includes(cardId);
}
