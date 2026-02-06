"use client";

import { useMemo, useState, useEffect } from "react";
import AppHeader from "./components/AppHeader";
import VoteCard from "./components/VoteCard";
import AdCard from "./components/AdCard";
import RecommendedTags from "./components/RecommendedTags";
import CollectionCard from "./components/CollectionCard";
import BottomNav from "./components/BottomNav";
import FeedTabs from "./components/FeedTabs";
import BookmarkCollectionModal from "./components/BookmarkCollectionModal";
import type { CurrentUser } from "./components/VoteCard";
import type { FeedTabId } from "./components/FeedTabs";
import type { VoteCardData } from "./data/voteCards";
import {
  voteCardsData,
  CARD_BACKGROUND_IMAGES,
  recommendedTagList,
} from "./data/voteCards";
import { getCreatedVotes } from "./data/createdVotes";
import {
  getAllActivity,
  addVote as persistVote,
  getMergedCounts,
  type CardActivity,
} from "./data/voteCardActivity";
import { getCollections, getCollectionsUpdatedEventName } from "./data/collections";

/** デモ用：非ログイン時は共通アイコン（SNSログイン時は type: 'sns', iconUrl, name を渡す） */
const demoCurrentUser: CurrentUser = { type: "guest" };

/** 急上昇中：1週間の2択解答・コメント数が多い順（モック：合計エンゲージメントでソート） */
function sortByTrending(cards: VoteCardData[]): VoteCardData[] {
  return [...cards].sort((a, b) => {
    const engagementA = a.countA + a.countB + a.commentCount;
    const engagementB = b.countA + b.countB + b.commentCount;
    return engagementB - engagementA;
  });
}

/** 新着：作成日が新しい順 */
function sortByNewest(cards: VoteCardData[]): VoteCardData[] {
  return [...cards].sort((a, b) =>
    (b.createdAt ?? "0").localeCompare(a.createdAt ?? "0")
  );
}

/** IDから安定した背景画像を選ぶ（同じカードは常に同じ背景） */
function backgroundForCard(card: VoteCardData): string {
  if (card.backgroundImageUrl) return card.backgroundImageUrl;
  let h = 0;
  const id = card.id ?? card.question;
  for (let i = 0; i < id.length; i++) h = ((h << 5) - h + id.charCodeAt(i)) | 0;
  const idx = Math.abs(h) % CARD_BACKGROUND_IMAGES.length;
  return CARD_BACKGROUND_IMAGES[idx];
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<FeedTabId>("trending");
  const [collections, setCollections] = useState(() => getCollections());
  const [activity, setActivity] = useState<Record<string, CardActivity>>({});
  const [modalCardId, setModalCardId] = useState<string | null>(null);

  useEffect(() => {
    setActivity(getAllActivity());
  }, []);

  useEffect(() => {
    const eventName = getCollectionsUpdatedEventName();
    const handler = () => setCollections(getCollections());
    window.addEventListener(eventName, handler);
    return () => window.removeEventListener(eventName, handler);
  }, []);

  const allCards = useMemo(() => {
    const created = getCreatedVotes();
    const seedWithId = voteCardsData.map((c, i) => ({ ...c, id: `seed-${i}` }));
    return [...created, ...seedWithId];
  }, []);

  const bookmarkedIds = useMemo(() => {
    const set = new Set<string>();
    collections.forEach((c) => c.cardIds.forEach((id) => set.add(id)));
    return set;
  }, [collections]);

  const cardsForTab = useMemo(() => {
    switch (activeTab) {
      case "trending":
        return sortByTrending(allCards);
      case "new":
        return sortByNewest(allCards);
      case "myTimeline": {
        return allCards
          .filter((card) => bookmarkedIds.has(card.id ?? ""))
          .sort((a, b) =>
            (b.createdAt ?? "0").localeCompare(a.createdAt ?? "0")
          );
      }
      default:
        return allCards;
    }
  }, [activeTab, bookmarkedIds, allCards]);

  return (
    <div className="min-h-screen bg-[#F1F1F1]">
      <AppHeader type="logo" />

      {/* タブ：急上昇中 / 新着 / myTimeline */}
      <FeedTabs
        activeId={activeTab}
        onSelect={setActiveTab}
        isLoggedIn={demoCurrentUser.type === "sns"}
      />

      {/* メインコンテンツ（下ナビ分の余白を確保） */}
      <main className="mx-auto max-w-lg px-[5.333vw] pb-24 pt-4">
        <div className="flex flex-col gap-6">
          {activeTab === "myTimeline" && demoCurrentUser.type === "guest" ? (
            <div className="rounded-[2rem] bg-white px-6 py-12 text-center shadow-[0_2px_1px_0_rgba(51,51,51,0.1)]">
              <p className="text-sm text-gray-600">
                SNSログインすると、ブックマークした投稿が
                <br />
                2択の解答やコメントの更新順にここに表示されます。
              </p>
            </div>
          ) : activeTab === "myTimeline" && cardsForTab.length === 0 ? (
            <div className="rounded-[2rem] bg-white px-6 py-12 text-center shadow-[0_2px_1px_0_rgba(51,51,51,0.1)]">
              <p className="text-sm text-gray-600">
                ブックマークした投稿がここに表示されます。
              </p>
            </div>
          ) : null}

          {cardsForTab.map((card) => {
            const cardId = card.id ?? card.question;
            const act = activity[cardId];
            const merged = getMergedCounts(
              card.countA ?? 0,
              card.countB ?? 0,
              card.commentCount ?? 0,
              act ?? { countA: 0, countB: 0, comments: [] }
            );
            return (
              <VoteCard
                key={cardId}
                backgroundImageUrl={backgroundForCard(card)}
                patternType={card.patternType}
                question={card.question}
                optionA={card.optionA}
                optionB={card.optionB}
                countA={merged.countA}
                countB={merged.countB}
                commentCount={merged.commentCount}
                tags={card.tags}
                readMoreText={card.readMoreText}
                creator={card.creator}
                currentUser={demoCurrentUser}
                cardId={cardId}
                bookmarked={bookmarkedIds.has(cardId)}
                initialSelectedOption={act?.userSelectedOption ?? null}
                onVote={(id, option) => {
                  persistVote(id, option);
                  setActivity((prev) => {
                    const cur = prev[id] ?? { countA: 0, countB: 0, comments: [] };
                    return {
                      ...prev,
                      [id]: {
                        countA: cur.countA + (option === "A" ? 1 : 0),
                        countB: cur.countB + (option === "B" ? 1 : 0),
                        comments: cur.comments ?? [],
                        userSelectedOption: option,
                      },
                    };
                  });
                }}
                onBookmarkClick={setModalCardId}
              />
            );
          })}

          <AdCard
            brandName="Oisix"
            caption="入会のご案内"
          />

          <RecommendedTags tags={recommendedTagList} />

          <CollectionCard
            title={"マリオのワンダーな\nVOTE"}
            titleVariant="blackBlock"
            label="コレクション"
          />
        </div>
      </main>

      {/* 下部ナビ（スマホメイン） */}
      <BottomNav activeId="home" />

      {modalCardId != null && (
        <BookmarkCollectionModal
          cardId={modalCardId}
          onClose={() => setModalCardId(null)}
          onCollectionsUpdated={() => setCollections(getCollections())}
        />
      )}
    </div>
  );
}
