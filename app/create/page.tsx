"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AppHeader from "../components/AppHeader";
import BottomNav from "../components/BottomNav";

const QUESTION_MAX = 80;

const relatedTopicsDemo = [
  {
    text: "週末に子ども3人連れてお出かけしてる\nワンオペパパへの感想は?",
    count: 20,
    comments: 1,
  },
  { text: "パパが好きすぎる?普通?", count: 10, comments: 0 },
  { text: "結婚してもパパと恋人感覚でいたい?", count: 6, comments: 0 },
];

export default function CreateQuestionPage() {
  const router = useRouter();
  const [question, setQuestion] = useState("");
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

      <main className="mx-auto max-w-lg px-[5.333vw] pt-4">
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
            {relatedTopicsDemo.map((topic, i) => (
              <li key={i} className="border-b border-gray-100 last:border-b-0">
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
            ))}
          </ul>
        </div>
      </main>

      <BottomNav activeId="add" />
    </div>
  );
}
