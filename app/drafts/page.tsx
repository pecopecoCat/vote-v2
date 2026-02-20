"use client";

import { useState } from "react";
import Link from "next/link";
import AppHeader from "../components/AppHeader";
import BottomNav from "../components/BottomNav";

const initialDrafts = [
  { id: "1", text: "猫が後をついてきていました..手持ちの食べ物をあげようと" },
  { id: "2", text: "豚バラか牛串か?" },
  { id: "3", text: "一人旅最長!自転車でどこまで行きました? 私は世田谷から奥多摩。" },
];

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
      />
    </svg>
  );
}

export default function DraftsPage() {
  const [drafts, setDrafts] = useState(initialDrafts);

  const handleDelete = (id: string) => {
    setDrafts((prev) => prev.filter((d) => d.id !== id));
  };

  return (
    <div className="min-h-screen bg-[#F1F1F1] pb-20">
      <AppHeader type="title" title="下書き" backHref="/create/form" />

      <main className="mx-auto max-w-lg bg-white shadow-[0_2px_1px_0_rgba(51,51,51,0.08)]">
        <ul className="divide-y divide-gray-100">
          {drafts.map((draft) => (
            <li key={draft.id} className="flex items-center gap-3 px-[5.333vw] py-4">
              <Link
                href={`/create/form?q=${encodeURIComponent(draft.text)}`}
                className="min-w-0 flex-1 text-sm text-gray-900"
              >
                {draft.text}
              </Link>
              <button
                type="button"
                className="shrink-0 p-2 text-gray-400 hover:text-gray-600"
                aria-label="削除"
                onClick={() => handleDelete(draft.id)}
              >
                <TrashIcon className="h-5 w-5" />
              </button>
            </li>
          ))}
        </ul>
      </main>

      <BottomNav activeId="add" />
    </div>
  );
}
