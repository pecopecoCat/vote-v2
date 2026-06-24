"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import type { Collection, CollectionVisibility } from "../data/collections";
import {
  COLLECTION_CATEGORY_OPTIONS,
  resolveCollectionCategory,
  type CollectionCategory,
} from "../data/collectionCategories";
import { type CollectionGradient } from "../data/search";
import { compressImageFile } from "../lib/compressImageFile";
import { showAppToast } from "../lib/appToast";

const VISIBILITY_OPTIONS: { value: CollectionVisibility; label: string }[] = [
  { value: "public", label: "公開" },
  { value: "member", label: "メンバー限定" },
];

export interface CollectionSettingsModalProps {
  onClose: () => void;
  onSave: (
    name: string,
    gradient: CollectionGradient,
    visibility: CollectionVisibility,
    category: CollectionCategory,
    coverImageUrl?: string
  ) => void | Promise<void>;
  editingCollection?: Collection | null;
}

export default function CollectionSettingsModal({
  onClose,
  onSave,
  editingCollection,
}: CollectionSettingsModalProps) {
  const [mounted, setMounted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [imageBusy, setImageBusy] = useState(false);
  const [name, setName] = useState(editingCollection?.name ?? "");
  const [visibility, setVisibility] = useState<CollectionVisibility>(() => {
    const v = editingCollection?.visibility ?? "public";
    return v === "private" ? "public" : v;
  });
  const [category, setCategory] = useState<CollectionCategory>(
    editingCollection ? resolveCollectionCategory(editingCollection) : "other"
  );
  const [coverImageUrl, setCoverImageUrl] = useState<string | undefined>(
    editingCollection?.coverImageUrl
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (editingCollection) {
      setName(editingCollection.name);
      const v = editingCollection.visibility;
      setVisibility(v === "private" ? "public" : v);
      setCategory(resolveCollectionCategory(editingCollection));
      setCoverImageUrl(editingCollection.coverImageUrl);
    } else {
      setName("");
      setVisibility("public");
      setCategory("other");
      setCoverImageUrl(undefined);
    }
  }, [editingCollection]);

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setImageBusy(true);
    try {
      const dataUrl = await compressImageFile(file);
      setCoverImageUrl(dataUrl);
    } catch (err) {
      showAppToast(err instanceof Error ? err.message : "画像を設定できませんでした。", "error");
    } finally {
      setImageBusy(false);
    }
  };

  const handleSave = async () => {
    if (saving) return;
    const trimmed = name.trim() || (editingCollection ? editingCollection.name : "新しいコレクション");
    const gradient: CollectionGradient = editingCollection?.gradient ?? "blue-cyan";
    setSaving(true);
    try {
      await onSave(trimmed, gradient, visibility, category, coverImageUrl ?? "");
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const node = (
    <>
      <div className="fixed inset-0 z-[100] bg-black/50" aria-hidden onClick={onClose} />
      <div
        className="fixed left-1/2 top-1/2 z-[110] w-[calc(100%-40px)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-5 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="collection-settings-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <h2 id="collection-settings-title" className="text-lg font-bold text-gray-900">
            コレクションの設定
          </h2>
          <button
            type="button"
            className="flex h-[22px] w-[22px] shrink-0 items-center justify-center"
            aria-label="閉じる"
            onClick={onClose}
          >
            <img
              src="/icons/icon_close.svg"
              alt=""
              className="icon-close-collection-settings"
              width={22}
              height={22}
            />
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
            <label className="mb-1.5 block text-sm font-medium text-gray-900">アイコン画像</label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="sr-only"
              aria-label="コレクションのアイコン画像を選択"
              onChange={(e) => void handleImageSelect(e)}
              disabled={imageBusy || saving}
            />
            <div className="relative inline-block h-10 w-10">
              <button
                type="button"
                disabled={imageBusy || saving}
                onClick={() => fileInputRef.current?.click()}
                className={`relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-full transition-transform active:scale-95 disabled:opacity-60 ${
                  coverImageUrl ? "ring-2 ring-[#FFE100] ring-offset-2" : "bg-[#D9D9D9]"
                }`}
                aria-label={coverImageUrl ? "アイコン画像を変更" : "アイコン画像を設定"}
              >
                {coverImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={coverImageUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span
                    className="block h-[17.5px] w-5 shrink-0"
                    style={{
                      backgroundColor: "#787878",
                      mask: "url(/icons/icon_photo.svg) no-repeat center/contain",
                      WebkitMask: "url(/icons/icon_photo.svg) no-repeat center/contain",
                    }}
                    aria-hidden
                  />
                )}
              </button>
              {coverImageUrl ? (
                <button
                  type="button"
                  disabled={imageBusy || saving}
                  onClick={() => setCoverImageUrl(undefined)}
                  className="absolute -right-1 -top-1 z-10 flex h-4 w-4 items-center justify-center rounded-full border border-white bg-[#333333] text-[10px] font-bold leading-none text-white shadow-sm"
                  aria-label="アイコン画像を削除"
                >
                  ×
                </button>
              ) : null}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-900">カテゴリ</label>
            <div className="flex flex-wrap gap-2">
              {COLLECTION_CATEGORY_OPTIONS.map((opt) => {
                const selected = category === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setCategory(opt.id)}
                    className={`rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
                      selected
                        ? "bg-[#FFE100] text-[#191919]"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {opt.label}
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
            disabled={saving}
            className="flex-1 rounded-[10px] border border-gray-200 bg-gray-100 py-3 text-sm font-medium text-gray-700 disabled:opacity-50"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving || imageBusy}
            className="btn-font flex-1 rounded-[10px] bg-[#FFE100] py-3 text-sm font-bold text-[#191919] hover:opacity-90 active:opacity-95 disabled:opacity-50"
          >
            {saving ? "保存中…" : "保存"}
          </button>
        </div>
      </div>
    </>
  );

  if (!mounted) return null;
  return createPortal(node, document.body);
}
