"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import AppHeader from "../components/AppHeader";
import BottomNav from "../components/BottomNav";
import { voteCardsData } from "../data/voteCards";
import { getCreatedVotes } from "../data/createdVotes";

const QUESTION_MAX = 80;
const RELATED_TOPICS_LIMIT = 5;

/** 入力テキストから関連トピック候補を検索（質問文にキーワードが含まれるVOTEを返す） */
function getRelatedTopicsFromInput(
  input: string,
  allCards: { question: string; countA: number; countB: number; commentCount: number }[],
  limit: number
): { text: string; count: number; comments: number }[] {
  const trimmed = input.trim().replace(/\s+/g, " ");
  if (!trimmed) return [];

  const keywords = trimmed
    .split(/\s+/)
    .filter((s) => s.length > 0)
    .slice(0, 5);
  if (keywords.length === 0) return [];

  const withScore = allCards
    .filter((card) => card.question.trim() !== trimmed)
    .map((card) => {
      const q = card.question;
      let score = 0;
      for (const kw of keywords) {
        if (q.includes(kw)) score += kw.length;
      }
      return { card, score };
    });

  return withScore
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ card }) => ({
      text: card.question,
      count: card.countA + card.countB,
      comments: card.commentCount,
    }));
}

export default function CreateQuestionPage() {
  const router = useRouter();
  const [question, setQuestion] = useState("");
  const [allCards, setAllCards] = useState<{ question: string; countA: number; countB: number; commentCount: number }[]>([]);

  useEffect(() => {
    const fromVotes = voteCardsData.map((c) => ({
      question: c.question,
      countA: c.countA,
      countB: c.countB,
      commentCount: c.commentCount,
    }));
    const fromCreated = getCreatedVotes().map((c) => ({
      question: c.question,
      countA: c.countA,
      countB: c.countB,
      commentCount: c.commentCount,
    }));
    const seen = new Set<string>();
    const merged = [...fromVotes, ...fromCreated].filter((c) => {
      if (seen.has(c.question)) return false;
      seen.add(c.question);
      return true;
    });
    setAllCards(merged);
  }, []);

  const relatedTopics = useMemo(
    () => getRelatedTopicsFromInput(question, allCards, RELATED_TOPICS_LIMIT),
    [question, allCards]
  );

  const len = question.length;
  const isValid = len > 0 && len <= QUESTION_MAX;

  const handleDecide = () => {
    if (!isValid) return;
    const params = new URLSearchParams({ q: question });
    router.push(`/create/form?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-[#F1F1F1] pb-20">
      <AppHeader type="title" title="質問を入力" backHref="/" />

      <main className="mx-auto max-w-lg px-[5.333vw] pt-[10px]">
        <div className="rounded-2xl bg-white p-4 shadow-[0_2px_1px_0_rgba(51,51,51,0.1)]">
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value.slice(0, QUESTION_MAX + 10))}
            placeholder="例) 朝ご飯は、"
            className="min-h-[120px] w-full resize-none rounded-xl border-0 bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400"
            maxLength={QUESTION_MAX + 5}
            aria-label="2択の質問"
          />
          <div className="mt-2 flex items-center justify-between">
            <span className={`text-sm ${len > QUESTION_MAX ? "text-red-600" : "text-gray-400"}`}>
              {len}/{QUESTION_MAX}
            </span>
            <button
              type="button"
              onClick={handleDecide}
              disabled={!isValid}
              className={`rounded-xl px-6 py-2.5 text-sm font-bold ${
                isValid ? "bg-[#FFE100] text-gray-900" : "bg-gray-200 text-gray-400"
              }`}
            >
              決定
            </button>
          </div>
        </div>

        <div className="mt-4 border-t border-gray-200 pt-4">
          <h2 className="bg-[#E5E7EB] py-2.5 pl-4 text-sm font-bold text-gray-900">関連トピック</h2>
          <ul className="overflow-hidden rounded-b-xl bg-white shadow-[0_2px_1px_0_rgba(51,51,51,0.1)]">
            {relatedTopics.length > 0 ? (
              relatedTopics.map((topic, i) => (
                <li key={`${topic.text}-${i}`} className="border-b border-gray-100 last:border-b-0">
                  <button
                    type="button"
                    className="block w-full px-4 py-3 text-left"
                    onClick={() => setQuestion(topic.text.replace(/\n/g, "").slice(0, QUESTION_MAX))}
                  >
                    <p className="whitespace-pre-line text-sm font-medium text-gray-900">{topic.text}</p>
                    <p className="mt-1 text-xs text-gray-500">
                      登録数 {topic.count}件・{topic.comments}コメント
                    </p>
                  </button>
                </li>
              ))
            ) : (
              <li className="px-4 py-4 text-center text-sm text-gray-500">
                質問を入力すると関連トピックが表示されます
              </li>
            )}
          </ul>
        </div>
      </main>

      <BottomNav activeId="add" />
    </div>
  );
}
