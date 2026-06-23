import type { Collection, CollectionVisibility } from "./collections";

export type CollectionCategory =
  | "anime-manga"
  | "drama"
  | "work"
  | "gourmet"
  | "life"
  | "sports"
  | "other";

export const COLLECTION_CATEGORY_OPTIONS: { id: CollectionCategory; label: string }[] = [
  { id: "anime-manga", label: "アニメ・漫画" },
  { id: "drama", label: "ドラマ" },
  { id: "work", label: "仕事" },
  { id: "gourmet", label: "グルメ" },
  { id: "life", label: "人生・ライフ" },
  { id: "sports", label: "スポーツ" },
  { id: "other", label: "その他" },
];

const CATEGORY_LABEL: Record<CollectionCategory, string> = Object.fromEntries(
  COLLECTION_CATEGORY_OPTIONS.map((o) => [o.id, o.label])
) as Record<CollectionCategory, string>;

export const COLLECTION_VISIBILITY_LABEL: Record<CollectionVisibility, string> = {
  public: "公開",
  private: "非公開",
  member: "メンバー限定",
};

export function getCollectionCategoryLabel(category: CollectionCategory): string {
  return CATEGORY_LABEL[category] ?? CATEGORY_LABEL.other;
}

/** 名前・タグからカテゴリを推定（未設定コレクション用） */
export function inferCollectionCategory(name: string): CollectionCategory {
  const n = name.toLowerCase();
  if (/アニメ|漫画|ゴルゴ|ワンピ|鬼滅|しんちゃん|ジャンプ/.test(name) || n.includes("anime")) {
    return "anime-manga";
  }
  if (/ドラマ|VIVANT|テレビ|映画/.test(name) || n.includes("drama")) return "drama";
  if (/仕事|ビジネス|キャリア|職場/.test(name)) return "work";
  if (/グルメ|献立|料理|レシピ|食/.test(name)) return "gourmet";
  if (/スポーツ|ゴルフ|サッカー|野球|YOGA|ヨガ|運動/.test(name)) return "sports";
  if (/人生|ワーママ|育児|ライフ|日常/.test(name)) return "life";
  return "other";
}

export function resolveCollectionCategory(collection: Pick<Collection, "name" | "category">): CollectionCategory {
  if (collection.category) return collection.category;
  return inferCollectionCategory(collection.name);
}

export type CollectionListSection = {
  id: string;
  title: string;
  collections: Collection[];
};

/** ピン留め＋カテゴリ別にグループ化（ピン留めはカテゴリに重複表示しない） */
export function groupCollectionsForListPage(
  collections: Collection[],
  pinnedCollectionIds: string[]
): CollectionListSection[] {
  const pinnedSet = new Set(pinnedCollectionIds);
  const pinned = collections.filter((c) => pinnedSet.has(c.id));
  const unpinned = collections.filter((c) => !pinnedSet.has(c.id));

  const byCategory = new Map<CollectionCategory, Collection[]>();
  for (const col of unpinned) {
    const cat = resolveCollectionCategory(col);
    const list = byCategory.get(cat) ?? [];
    list.push(col);
    byCategory.set(cat, list);
  }

  const sections: CollectionListSection[] = [];
  if (pinned.length > 0) {
    sections.push({ id: "pinned", title: "ピン留め", collections: pinned });
  }
  for (const { id, label } of COLLECTION_CATEGORY_OPTIONS) {
    const list = byCategory.get(id);
    if (list && list.length > 0) {
      sections.push({ id, title: label, collections: list });
    }
  }
  return sections;
}
