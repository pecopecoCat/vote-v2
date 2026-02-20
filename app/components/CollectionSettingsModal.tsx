"use client";

import { useState, useEffect } from "react";
import type { Collection, CollectionVisibility } from "../data/collections";
import { COLLECTION_GRADIENT_OPTIONS, type CollectionGradient } from "../data/search";

const VISIBILITY_OPTIONS: { value: CollectionVisibility; label: string }[] = [
  { value: "public", label: "公開" },
  { value: "private", label: "非公開" },
  { value: "member", label: "メンバー限定" },
];

export interface CollectionSettingsModalProps {
  onClose: () => void;
  /** 保存時は name, gradient, visibility を渡す（Bookmark/検索/MyPage/設定で共通グラデーション） */
  onSave: (name: string, gradient: CollectionGradient, visibility: CollectionVisibility) => void;
  /** 編集時は既存コレクションを渡す（新規のときは undefined） */
  editingCollection?: Collection | null;
}

export default function CollectionSettingsModal({ onClose, onSave, editingCollection }: CollectionSettingsModalProps) {
  const [name, setName] = useState(editingCollection?.name ?? "");
  const [gradient, setGradient] = useState<CollectionGradient>(editingCollection?.gradient ?? "blue-cyan");
  const [visibility, setVisibility] = useState<CollectionVisibility>(editingCollection?.visibility ?? "public");

  useEffect(() => {
    if (editingCollection) {
      setName(editingCollection.name);
      setGradient(editingCollection.gradient ?? "blue-cyan");
      setVisibility(editingCollection.visibility);
    } else {
      setName("");
      setGradient("blue-cyan");
      setVisibility("public");
    }
  }, [editingCollection]);

  const handleSave = () => {
    const trimmed = name.trim() || (editingCollection ? editingCollection.name : "新しいコレクション");
    onSave(trimmed, gradient, visibility);
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/50" aria-hidden onClick={onClose} />
      <div className="fixed left-1/2 top-1/2 z-[70] w-[calc(100%-40px)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-5 shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <h2 className="text-lg font-bold text-gray-900">コレクションの設定</h2>
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center text-blue-600"
            aria-label="閉じる"
            onClick={onClose}
          >
            <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
            </svg>
          </button>
        </div>

        <div className="space-y-4 pt-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-900">コレクション名</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="コレクション名を入力"
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none placeholder:text-gray-400"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-900">背景カラー</label>
            <div className="flex flex-wrap gap-3">
              {COLLECTION_GRADIENT_OPTIONS.map((c) => {
                const isSelected = gradient === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setGradient(c.id)}
                    className={`relative h-10 w-10 shrink-0 rounded-full transition-transform active:scale-95 ${
                      isSelected ? "ring-2 ring-[#FFE100] ring-offset-2" : ""
                    }`}
                    style={{
                      background: `linear-gradient(to bottom, ${c.start}, ${c.end})`,
                    }}
                    aria-label={`グラデーション ${c.id}`}
                  >
                    {isSelected && (
                      <span className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#FFE100]">
                        <svg className="h-3 w-3" fill="#191919" viewBox="0 0 24 24">
                          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                        </svg>
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-900">公開設定</label>
            <div className="flex flex-col gap-2">
              {VISIBILITY_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-100 py-2.5 pl-3"
                >
                  <span className="relative h-5 w-5 shrink-0">
                    <input
                      type="radio"
                      name="visibility"
                      value={opt.value}
                      checked={visibility === opt.value}
                      onChange={() => setVisibility(opt.value)}
                      className="sr-only"
                    />
                    <span
                      className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                        visibility === opt.value ? "border-[#FFE100] bg-[#FFE100]" : "border-gray-300 bg-white"
                      }`}
                    >
                      {visibility === opt.value && (
                        <svg className="h-3 w-3" fill="#191919" viewBox="0 0 24 24">
                          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                        </svg>
                      )}
                    </span>
                  </span>
                  <span className="text-sm text-gray-900">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-[9999px] border border-gray-200 bg-gray-100 py-3 text-sm font-medium text-gray-700"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 rounded-[9999px] bg-[#FFE100] py-3 text-sm font-bold text-gray-900"
          >
            保存
          </button>
        </div>
      </div>
    </>
  );
}
