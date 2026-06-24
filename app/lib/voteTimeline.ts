import { getOtherUsersCollections } from "../data/collections";
import { popularCollections, type CollectionGradient } from "../data/search";
import type { VoteCardData } from "../data/voteCards";

/** タイムライン差し込みルール：3個に1つコレクション、10個につき1setおすすめタグ、15個につき1つPR */
const COLLECTION_EVERY = 3;
const TAGS_EVERY = 10;
const PR_BANNER_EVERY = 15;

export type PrBannerItem = {
  brandName: string;
  caption: string;
  imageUrl?: string;
  fallbackGradientClassName?: string;
};

/** PRバナー（何種類か登録可能・15個に1つで順番ローテーション） */
export const PR_BANNERS: PrBannerItem[] = [
  {
    brandName: "Oisix",
    caption: "入会のご案内",
    imageUrl: "/banners/oisix-banner.png",
  },
  {
    brandName: "TRAVEL SNAP",
    caption: "週末旅プラン｜読者アンケート募集中",
    fallbackGradientClassName:
      "bg-gradient-to-br from-sky-500/95 via-blue-600/90 to-indigo-800/95",
  },
  {
    brandName: "MINI MART",
    caption: "新商品お試し｜店舗限定クーポン（デモ）",
    fallbackGradientClassName:
      "bg-gradient-to-br from-amber-400/95 via-orange-500/90 to-rose-600/90",
  },
  {
    brandName: "FIT LOOP",
    caption: "毎日5分｜姿勢ケアアプリ特集",
    fallbackGradientClassName:
      "bg-gradient-to-br from-emerald-500/95 via-teal-600/90 to-cyan-800/95",
  },
  {
    brandName: "AUDIO LAB",
    caption: "ノイキャン比較｜人気3モデルまとめ",
    fallbackGradientClassName:
      "bg-gradient-to-br from-violet-600/95 via-purple-700/90 to-fuchsia-900/95",
  },
  {
    brandName: "HOME BOX",
    caption: "収納アイデア｜before/after 特集",
    fallbackGradientClassName:
      "bg-gradient-to-br from-stone-500/95 via-neutral-600/90 to-zinc-900/95",
  },
  {
    brandName: "SWEET NOTE",
    caption: "季節スイーツ｜都内カフェ10選",
    fallbackGradientClassName:
      "bg-gradient-to-br from-pink-400/95 via-rose-500/90 to-red-700/90",
  },
  {
    brandName: "LOCAL NEWS+",
    caption: "地域トピック｜ライター募集（デモ）",
    fallbackGradientClassName:
      "bg-gradient-to-br from-slate-600/95 via-slate-800/90 to-slate-950/95",
  },
  {
    brandName: "PR",
    caption: "おすすめコンテンツ",
    fallbackGradientClassName:
      "bg-gradient-to-br from-red-400/90 via-red-500/80 to-green-600/90",
  },
];

export type TimelineCollection = { id: string; title: string; gradient: CollectionGradient };

export type TimelineItem =
  | { type: "vote"; card: VoteCardData }
  | { type: "collection"; collection: TimelineCollection }
  | { type: "tags" }
  | { type: "pr"; banner: PrBannerItem };

/** 実際にあるコレクションのプール（人気＋他ユーザー＋自分のコレクション） */
export function getTimelineCollectionPool(
  collections: { id: string; name: string; gradient?: CollectionGradient; visibility?: string }[]
): TimelineCollection[] {
  const other = getOtherUsersCollections().map((c) => ({
    id: c.id,
    title: c.name,
    gradient: (c.gradient ?? "orange-yellow") as CollectionGradient,
  }));
  const mine = collections
    .filter((c) => c.visibility !== "member")
    .map((c) => ({
      id: c.id,
      title: c.name,
      gradient: (c.gradient ?? "orange-yellow") as CollectionGradient,
    }));
  return [...popularCollections, ...other, ...mine];
}

/** タイムライン配列を組み立て（3/10/15ルール・コレクションは位置で安定選択） */
export function buildTimelineItems(
  cards: VoteCardData[],
  collectionPool: TimelineCollection[]
): TimelineItem[] {
  const items: TimelineItem[] = [];
  let prBannerIndex = 0;
  for (let i = 0; i < cards.length; i++) {
    const oneBased = i + 1;
    if (oneBased % COLLECTION_EVERY === 0 && collectionPool.length > 0) {
      const colIndex = Math.floor(oneBased / COLLECTION_EVERY) % collectionPool.length;
      const col = collectionPool[colIndex];
      items.push({
        type: "collection",
        collection: { id: col.id, title: col.title, gradient: col.gradient },
      });
    }
    if (oneBased % TAGS_EVERY === 0) {
      items.push({ type: "tags" });
    }
    if (oneBased % PR_BANNER_EVERY === 0) {
      items.push({ type: "pr", banner: PR_BANNERS[prBannerIndex % PR_BANNERS.length] });
      prBannerIndex += 1;
    }
    items.push({ type: "vote", card: cards[i] });
  }
  return items;
}
