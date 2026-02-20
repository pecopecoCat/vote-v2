"use client";

import { useCallback, useEffect, useRef, useState, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import AppHeader from "../../components/AppHeader";
import BottomNav from "../../components/BottomNav";
import Button from "../../components/Button";
import Checkbox from "../../components/Checkbox";
import { getCollections } from "../../data/collections";
import { getAuth } from "../../data/auth";
import { CARD_BACKGROUND_IMAGES } from "../../data/voteCards";
import { addCreatedVote } from "../../data/createdVotes";

const QUESTION_MAX = 80;
const OPTION_MAX = 30; // A/Bの回答の文字数上限（画像の「00文字以内」はここで表示）

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 10 }, (_, i) => CURRENT_YEAR + i);
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

function CreateFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const qFromUrl = searchParams.get("q") ?? "";

  const [question, setQuestion] = useState(qFromUrl);
  const [optionA, setOptionA] = useState("");
  const [optionB, setOptionB] = useState("");
  const [optionAImageUrl, setOptionAImageUrl] = useState<string | undefined>(undefined);
  const [optionBImageUrl, setOptionBImageUrl] = useState<string | undefined>(undefined);
  const fileInputARef = useRef<HTMLInputElement>(null);
  const fileInputBRef = useRef<HTMLInputElement>(null);
  const [reason, setReason] = useState("");
  const [noComments, setNoComments] = useState(false);
  const [hashtagQuery, setHashtagQuery] = useState("");
  const [selectedBackgroundUrl, setSelectedBackgroundUrl] = useState<string>(
    CARD_BACKGROUND_IMAGES[0]
  );
  const [selectedCollectionId, setSelectedCollectionId] = useState("");
  const [collectionOpen, setCollectionOpen] = useState(false);
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [useVotePeriod, setUseVotePeriod] = useState(false);

  const [startYear, setStartYear] = useState(CURRENT_YEAR);
  const [startMonth, setStartMonth] = useState(new Date().getMonth() + 1);
  const [startDay, setStartDay] = useState(new Date().getDate());
  const [endYear, setEndYear] = useState(CURRENT_YEAR);
  const [endMonth, setEndMonth] = useState(new Date().getMonth() + 1);
  const [endDay, setEndDay] = useState(() => {
    const d = new Date();
    const end = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 7);
    return end.getDate();
  });

  const [collections, setCollections] = useState<{ id: string; name: string }[]>([]);
  useEffect(() => {
    setCollections(getCollections());
  }, []);

  useEffect(() => {
    if (qFromUrl) setQuestion(qFromUrl);
  }, [qFromUrl]);

  /** ログイン後のみVOTEを作成可能。ログイン後はこの画面へ戻す */
  useEffect(() => {
    if (!getAuth().isLoggedIn) {
      const returnPath = "/create/form" + (qFromUrl ? "?q=" + encodeURIComponent(qFromUrl) : "");
      router.replace("/profile?returnTo=" + encodeURIComponent(returnPath));
    }
  }, [router, qFromUrl]);

  const canSubmit =
    question.trim().length > 0 &&
    question.length <= QUESTION_MAX &&
    optionA.trim().length > 0 &&
    optionB.trim().length > 0;

  const handleSubmit = useCallback(() => {
    if (!canSubmit) return;
    const now = new Date().toISOString();
    const tags = hashtagQuery.trim() ? hashtagQuery.trim().split(/\s+/).filter(Boolean) : undefined;
    addCreatedVote({
      id: `created-${Date.now()}`,
      patternType: "yellow-loops",
      backgroundImageUrl: selectedBackgroundUrl,
      question: question.trim(),
      optionA: optionA.trim(),
      optionB: optionB.trim(),
      countA: 0,
      countB: 0,
      commentCount: 0,
      tags,
      createdAt: now,
      visibility,
      optionAImageUrl: optionAImageUrl || undefined,
      optionBImageUrl: optionBImageUrl || undefined,
    });
    router.push("/");
  }, [
    canSubmit,
    router,
    question,
    optionA,
    optionB,
    optionAImageUrl,
    optionBImageUrl,
    hashtagQuery,
    selectedBackgroundUrl,
    visibility,
  ]);

  const handleImageSelect = useCallback(
    (side: "A" | "B", e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !file.type.startsWith("image/")) return;
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        if (side === "A") setOptionAImageUrl(dataUrl);
        else setOptionBImageUrl(dataUrl);
      };
      reader.readAsDataURL(file);
      e.target.value = "";
    },
    []
  );

  return (
    <div className="min-h-screen bg-[#F1F1F1] pb-24">
      <AppHeader
        type="title"
        title="VOTEを作成"
        backHref="/"
        right={
          <Link
            href="/drafts"
            className="whitespace-nowrap rounded-[9999px] border-2 border-[#FFE100] bg-white px-3 py-1.5 text-sm font-bold text-gray-900"
          >
            下書き
          </Link>
        }
      />

      <main className="mx-auto max-w-lg space-y-[30px] px-[5.333vw] pb-8 pt-4">
        {/* 2択の質問（80文字）* - タップで質問入力画面へ */}
        <section>
          <h2 className="mb-1 text-sm font-bold text-gray-900">
            2択の質問（80文字） <span className="text-red-600">*</span>
          </h2>
          <button
            type="button"
            onClick={() =>
              router.push(`/create?q=${encodeURIComponent(question)}`)
            }
            className="flex min-h-[80px] w-full flex-col items-start rounded-xl bg-white p-5 text-left shadow-none outline-none"
          >
            <span
              className={`min-h-[52px] w-full resize-none text-sm outline-none placeholder:text-gray-400 ${
                question ? "text-gray-900" : "text-gray-400"
              }`}
            >
              {question || "例) 朝ご飯は、"}
            </span>
          </button>
          <p className={`mt-1 text-xs ${question.length > QUESTION_MAX ? "text-red-600" : "text-gray-500"}`}>
            {question.length}/{QUESTION_MAX}
          </p>
        </section>

        {/* Aの回答（00文字以内）* + 画像設定 */}
        <section>
          <h2 className="mb-1 text-sm font-bold text-gray-900">
            Aの回答（{OPTION_MAX}文字以内） <span className="text-red-600">*</span>
          </h2>
          <div className="relative rounded-xl bg-white p-5 pr-[60px]">
            <input
              type="text"
              value={optionA}
              onChange={(e) => setOptionA(e.target.value.slice(0, OPTION_MAX))}
              placeholder="例) パン"
              className="w-full border-0 bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400"
            />
            <input
              ref={fileInputARef}
              type="file"
              accept="image/*"
              className="sr-only"
              aria-label="Aの画像を選択"
              onChange={(e) => handleImageSelect("A", e)}
            />
            <button
              type="button"
              onClick={() => fileInputARef.current?.click()}
              className="absolute right-5 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-[10px] bg-[#D9D9D9] hover:opacity-90"
              aria-label={optionAImageUrl ? "Aの画像を変更" : "Aの画像を設定"}
            >
              {optionAImageUrl ? (
                <span className="relative flex h-8 w-8 overflow-hidden rounded-lg border border-gray-200 pointer-events-none">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={optionAImageUrl} alt="" className="h-full w-full object-cover" />
                </span>
              ) : (
                <span
                  className="block h-[17.5px] w-5 shrink-0 pointer-events-none"
                  style={{
                    backgroundColor: "#787878",
                    mask: "url(/icons/icon_photo.svg) no-repeat center/contain",
                    WebkitMask: "url(/icons/icon_photo.svg) no-repeat center/contain",
                  }}
                />
              )}
            </button>
          </div>
        </section>

        {/* Bの回答（00文字以内）* + 画像設定 */}
        <section>
          <h2 className="mb-1 text-sm font-bold text-gray-900">
            Bの回答（{OPTION_MAX}文字以内） <span className="text-red-600">*</span>
          </h2>
          <div className="relative rounded-xl bg-white p-5 pr-[60px]">
            <input
              type="text"
              value={optionB}
              onChange={(e) => setOptionB(e.target.value.slice(0, OPTION_MAX))}
              placeholder="例) パン"
              className="w-full border-0 bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400"
            />
            <input
              ref={fileInputBRef}
              type="file"
              accept="image/*"
              className="sr-only"
              aria-label="Bの画像を選択"
              onChange={(e) => handleImageSelect("B", e)}
            />
            <button
              type="button"
              onClick={() => fileInputBRef.current?.click()}
              className="absolute right-5 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-[10px] bg-[#D9D9D9] hover:opacity-90"
              aria-label={optionBImageUrl ? "Bの画像を変更" : "Bの画像を設定"}
            >
              {optionBImageUrl ? (
                <span className="relative flex h-8 w-8 overflow-hidden rounded-lg border border-gray-200 pointer-events-none">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={optionBImageUrl} alt="" className="h-full w-full object-cover" />
                </span>
              ) : (
                <span
                  className="block h-[17.5px] w-5 shrink-0 pointer-events-none"
                  style={{
                    backgroundColor: "#787878",
                    mask: "url(/icons/icon_photo.svg) no-repeat center/contain",
                    WebkitMask: "url(/icons/icon_photo.svg) no-repeat center/contain",
                  }}
                />
              )}
            </button>
          </div>
        </section>

        {/* 質問の理由（他と同様に白背景ボックス外・入力下にCheckbox） */}
        <section>
          <h2 className="mb-1 text-sm font-bold text-gray-900">質問の理由</h2>
          <div className="rounded-xl bg-white p-5">
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="例) 家族でパンvsご飯にわかれます。世の中のみんながどっち派か教えて。決着つけたい。"
              className="min-h-[80px] w-full resize-none border-0 bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400"
            />
          </div>
          <div className="mt-[10px]">
            <Checkbox
              checked={noComments}
              onChange={setNoComments}
              label="コメントを求めない"
            />
          </div>
        </section>

        {/* ハッシュタグを設定 */}
        <section>
          <h2 className="mb-1 text-sm font-bold text-gray-900">ハッシュタグを設定</h2>
          <div className="flex items-center gap-2 rounded-xl bg-white p-5">
            <MagnifyIcon className="h-5 w-5 shrink-0 text-gray-400" />
            <input
              type="text"
              value={hashtagQuery}
              onChange={(e) => setHashtagQuery(e.target.value)}
              placeholder="タグを検索"
              className="min-w-0 flex-1 border-0 bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400"
            />
          </div>
        </section>

        {/* 背景デザイン（画像から選択）・黄縁2倍・内側白縁・チェックはみ出しOK・シャドウ画像参考・画像切れ防止 */}
        <section>
          <h2 className="mb-2 text-sm font-bold text-gray-900">背景デザイン</h2>
          <div className="flex gap-1.5 overflow-x-auto pb-2 pr-2 pt-2">
            {CARD_BACKGROUND_IMAGES.map((url) => (
              <button
                key={url}
                type="button"
                onClick={() => setSelectedBackgroundUrl(url)}
                className={`relative h-14 w-14 shrink-0 overflow-visible rounded-full ${
                  selectedBackgroundUrl === url
                    ? "border-[6px] border-[#FFE100] ring-2 ring-inset ring-white shadow-[0_2px_2px_0_rgba(0,0,0,0.08)]"
                    : "border-[6px] border-transparent"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt=""
                  className="h-full w-full rounded-full object-contain"
                />
                {selectedBackgroundUrl === url && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-black shadow-[0_2px_2px_0_rgba(0,0,0,0.08)]">
                    <CheckIcon className="h-3 w-3 text-white" />
                  </span>
                )}
              </button>
            ))}
          </div>
        </section>

        {/* 投票期間（チェックで設定するか選択・年・月・日） */}
        <section>
          <h2 className="mb-2 text-sm font-bold text-gray-900">投票期間</h2>
          <div className="mb-3">
            <Checkbox
              checked={useVotePeriod}
              onChange={setUseVotePeriod}
              label="投票期間を設定する"
            />
          </div>
          {useVotePeriod && (
          <div className="space-y-3 rounded-xl bg-white p-4">
            <div>
              <p className="mb-1 text-xs text-gray-600">開始期間</p>
              <div className="flex flex-wrap items-center gap-1">
                <select
                  value={startYear}
                  onChange={(e) => setStartYear(Number(e.target.value))}
                  className="rounded-lg border border-gray-200 bg-white px-2 py-2 text-sm text-gray-900"
                >
                  {YEARS.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
                <span className="text-sm text-gray-500">年</span>
                <select
                  value={startMonth}
                  onChange={(e) => setStartMonth(Number(e.target.value))}
                  className="rounded-lg border border-gray-200 bg-white px-2 py-2 text-sm text-gray-900"
                >
                  {MONTHS.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
                <span className="text-sm text-gray-500">月</span>
                <select
                  value={startDay}
                  onChange={(e) => setStartDay(Number(e.target.value))}
                  className="rounded-lg border border-gray-200 bg-white px-2 py-2 text-sm text-gray-900"
                >
                  {DAYS.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
                <span className="text-sm text-gray-500">日</span>
              </div>
            </div>
            <div>
              <p className="mb-1 text-xs text-gray-600">終了期間</p>
              <div className="flex flex-wrap items-center gap-1">
                <select
                  value={endYear}
                  onChange={(e) => setEndYear(Number(e.target.value))}
                  className="rounded-lg border border-gray-200 bg-white px-2 py-2 text-sm text-gray-900"
                >
                  {YEARS.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
                <span className="text-sm text-gray-500">年</span>
                <select
                  value={endMonth}
                  onChange={(e) => setEndMonth(Number(e.target.value))}
                  className="rounded-lg border border-gray-200 bg-white px-2 py-2 text-sm text-gray-900"
                >
                  {MONTHS.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
                <span className="text-sm text-gray-500">月</span>
                <select
                  value={endDay}
                  onChange={(e) => setEndDay(Number(e.target.value))}
                  className="rounded-lg border border-gray-200 bg-white px-2 py-2 text-sm text-gray-900"
                >
                  {DAYS.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
                <span className="text-sm text-gray-500">日</span>
              </div>
            </div>
          </div>
          )}
        </section>

        {/* コレクション（自分のコレクションをプルダウン・画像デザイン・黄丸に矢印アイコン） */}
        <section className="relative">
          <h2 className="mb-1 flex items-center gap-1 text-sm font-bold text-gray-900">
            コレクション
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-200 text-xs text-gray-600">
              ?
            </span>
          </h2>
          <button
            type="button"
            onClick={() => setCollectionOpen((o) => !o)}
            className="flex w-full items-center rounded-[9999px] border border-gray-200 bg-white px-4 py-3 text-left"
          >
            <span
              className={`min-w-0 flex-1 text-sm ${selectedCollectionId ? "text-gray-900" : "text-gray-400"}`}
            >
              {selectedCollectionId
                ? collections.find((c) => c.id === selectedCollectionId)?.name ?? "選択中"
                : "追加したいコレクションを選択"}
            </span>
            <span className="ml-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#FFE100]">
              <img
                src="/icons/icon_b_arrow.svg"
                alt=""
                className={`h-1.5 w-2 transition-transform ${collectionOpen ? "rotate-180" : ""}`}
                width={8}
                height={6}
              />
            </span>
          </button>
          {collectionOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                aria-hidden
                onClick={() => setCollectionOpen(false)}
              />
              <ul className="absolute left-0 right-0 top-full z-20 mt-1 max-h-48 overflow-auto rounded-[20px] border border-gray-200 bg-white py-1 shadow-lg">
                {collections.length === 0 ? (
                  <li className="px-4 py-3 text-sm text-gray-500">コレクションがありません</li>
                ) : (
                  collections.map((col) => (
                    <li key={col.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCollectionId(col.id);
                          setCollectionOpen(false);
                        }}
                        className="w-full px-4 py-3 text-left text-sm text-gray-900 hover:bg-gray-50"
                      >
                        {col.name}
                      </button>
                    </li>
                  ))
                )}
              </ul>
            </>
          )}
        </section>
      </main>

      {/* 固定フッター: VOTEを作成 */}
      <div className="fixed bottom-14 left-0 right-0 z-10 mx-auto max-w-lg px-[5.333vw] pb-2 pt-2">
        <Button variant="createVote" type="button" onClick={handleSubmit} disabled={!canSubmit}>
          VOTEを作成
        </Button>
      </div>

      <BottomNav activeId="add" />
    </div>
  );
}

export default function CreateFormPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F1F1F1] flex items-center justify-center">読み込み中...</div>}>
      <CreateFormContent />
    </Suspense>
  );
}

function MagnifyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
      />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
    </svg>
  );
}

