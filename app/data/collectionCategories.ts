import type { Collection, CollectionVisibility } from "./collections";

export type CollectionCategory =
  | "anime-manga"
  | "drama"
  | "parenting"
  | "work"
  | "marriage-love"
  | "art"
  | "sports"
  | "wellness"
  | "study"
  | "consultation"
  | "game"
  | "gourmet-alcohol"
  | "animals"
  | "travel"
  | "movie"
  | "entertainment"
  | "music"
  | "other";

export const COLLECTION_CATEGORY_OPTIONS: { id: CollectionCategory; label: string }[] = [
  { id: "anime-manga", label: "アニメ・漫画" },
  { id: "drama", label: "ドラマ" },
  { id: "parenting", label: "育児" },
  { id: "work", label: "仕事" },
  { id: "marriage-love", label: "結婚・恋愛" },
  { id: "art", label: "アート" },
  { id: "sports", label: "スポーツ" },
  { id: "wellness", label: "ウェルネス" },
  { id: "study", label: "勉強" },
  { id: "consultation", label: "相談" },
  { id: "game", label: "ゲーム" },
  { id: "gourmet-alcohol", label: "グルメ・お酒" },
  { id: "animals", label: "動物" },
  { id: "travel", label: "旅行" },
  { id: "movie", label: "映画" },
  { id: "entertainment", label: "芸能" },
  { id: "music", label: "音楽" },
  { id: "other", label: "その他" },
];

const VALID_CATEGORY_IDS = new Set<string>(COLLECTION_CATEGORY_OPTIONS.map((o) => o.id));

/** 旧カテゴリ ID → 新 ID（localStorage / KV 互換） */
const LEGACY_CATEGORY_MAP: Record<string, CollectionCategory> = {
  gourmet: "gourmet-alcohol",
  life: "parenting",
};

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

export function normalizeCollectionCategory(value: string | undefined): CollectionCategory | undefined {
  if (!value) return undefined;
  if (VALID_CATEGORY_IDS.has(value)) return value as CollectionCategory;
  return LEGACY_CATEGORY_MAP[value];
}

/** 名前・タグからカテゴリを推定（未設定コレクション用） */
export function inferCollectionCategory(name: string): CollectionCategory {
  const n = name.toLowerCase();
  if (/アニメ|漫画|ゴルゴ|ワンピ|鬼滅|しんちゃん|ジャンプ/.test(name) || n.includes("anime")) {
    return "anime-manga";
  }
  if (/ドラマ|VIVANT|テレビ/.test(name) || n.includes("drama")) return "drama";
  if (/育児|ワーママ|子育て|ママ|パパ/.test(name)) return "parenting";
  if (/仕事|ビジネス|キャリア|職場/.test(name)) return "work";
  if (/結婚|恋愛|カップル|婚活|彼氏|彼女/.test(name)) return "marriage-love";
  if (/アート|美術|イラスト|デザイン|創作/.test(name)) return "art";
  if (/スポーツ|ゴルフ|サッカー|野球|バスケ|ランニング/.test(name)) return "sports";
  if (/ウェルネス|YOGA|ヨガ|健康|メンタル|瞑想|フィットネス/.test(name)) return "wellness";
  if (/勉強|学習|受験|資格|英語|語学/.test(name)) return "study";
  if (/相談|ぼやき|悩み|人生/.test(name)) return "consultation";
  if (/ゲーム|eスポ|Switch|PlayStation|Steam/.test(name)) return "game";
  if (/グルメ|献立|料理|レシピ|食|お酒|ビール|ワイン/.test(name)) return "gourmet-alcohol";
  if (/動物|ペット|猫|犬|ねこ|いぬ/.test(name)) return "animals";
  if (/旅行|旅|観光|海外|国内旅行/.test(name)) return "travel";
  if (/映画|シネマ|洋画|邦画/.test(name)) return "movie";
  if (/芸能|アイドル|タレント|推し|K-POP|Kポ/.test(name)) return "entertainment";
  if (/音楽|ライブ|バンド|J-POP|歌/.test(name)) return "music";
  return "other";
}

export function resolveCollectionCategory(collection: Pick<Collection, "name" | "category">): CollectionCategory {
  const normalized = normalizeCollectionCategory(collection.category);
  if (normalized) return normalized;
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
