"use client";

import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import AppHeader from "../../components/AppHeader";
import Button from "../../components/Button";
import Checkbox from "../../components/Checkbox";
import { createOwnedCollectionFromSettings } from "../../data/collections";
import CollectionPickerSheet from "../../components/CollectionPickerSheet";
import CollectionSettingsModal from "../../components/CollectionSettingsModal";
import CreateQuestionStep from "../CreateQuestionStep";
import CreateVoteFormHeader from "./CreateVoteFormHeader";
import { QUESTION_MAX } from "./createVoteFormConstants";
import { useCreateVoteForm } from "./useCreateVoteForm";
import VoteFormBackgroundPicker from "./VoteFormBackgroundPicker";
import VoteFormOptionField from "./VoteFormOptionField";
import VoteFormPeriodSection from "./VoteFormPeriodSection";
import VoteFormTagsSection from "./VoteFormTagsSection";
import { isCollectionVoteCardAddEnabled } from "../../lib/collectionVoteCardMutation";

function CreateVoteFormContent({
  variant = "page",
  onClose,
}: {
  variant?: "page" | "modal";
  onClose?: () => void;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const qFromUrl = searchParams.get("q") ?? "";
  const draftIdFromUrl = searchParams.get("draft") ?? "";
  const isModal = variant === "modal";

  const form = useCreateVoteForm({ qFromUrl, draftIdFromUrl });

  if (isModal && form.showQuestionStep) {
    return (
      <div className="flex min-h-0 flex-1 flex-col bg-[#F1F1F1]">
        <AppHeader
          type="title"
          title="質問を入力"
          onBack={() => form.setShowQuestionStep(false)}
        />
        <CreateQuestionStep
          embedded
          initialQuestion={form.question}
          onDecide={(q) => {
            form.setQuestion(q);
            form.setShowQuestionStep(false);
          }}
        />
      </div>
    );
  }

  return (
    <div
      className={
        isModal
          ? "relative flex min-h-0 flex-1 flex-col bg-[#F1F1F1]"
          : "min-h-screen bg-[#F1F1F1] pb-[50px]"
      }
    >
      <CreateVoteFormHeader
        variant={variant}
        onClose={onClose}
        onSaveDraft={form.handleSaveDraftAndGoToDrafts}
      />

      <main
        className={`mx-auto w-full flex-1 space-y-[30px] pt-4 ${
          isModal ? "max-w-none overflow-y-auto px-4 pb-4" : "max-w-lg px-[5.333vw] pb-28"
        }`}
      >
        <section>
          <h2 className="mb-1 text-sm font-bold text-gray-900">
            2択の質問（80文字） <span className="text-red-600">*</span>
          </h2>
          <button
            type="button"
            onClick={() => {
              if (isModal) {
                form.setShowQuestionStep(true);
                return;
              }
              router.push(`/create?q=${encodeURIComponent(form.question)}`);
            }}
            className="flex min-h-[80px] w-full flex-col items-start rounded-xl bg-white p-5 text-left shadow-none outline-none"
          >
            <span
              className={`min-h-[52px] w-full resize-none text-sm outline-none placeholder:text-gray-400 ${
                form.question ? "text-gray-900" : "text-gray-400"
              }`}
            >
              {form.question || "例) 朝ご飯は、"}
            </span>
          </button>
          <p
            className={`mt-1 text-xs ${form.question.length > QUESTION_MAX ? "text-red-600" : "text-gray-500"}`}
          >
            {form.question.length}/{QUESTION_MAX}
          </p>
        </section>

        <VoteFormOptionField
          side="A"
          label="Aの回答"
          placeholder="例) パン"
          value={form.optionA}
          onChange={form.setOptionA}
          imageUrl={form.optionAImageUrl}
          onImageSelect={(e) => form.handleImageSelect("A", e)}
          onImageRemove={() => form.handleImageRemove("A")}
          imageBusy={form.imageCompressingSide === "A"}
        />

        <VoteFormOptionField
          side="B"
          label="Bの回答"
          placeholder="例) パン"
          value={form.optionB}
          onChange={form.setOptionB}
          imageUrl={form.optionBImageUrl}
          onImageSelect={(e) => form.handleImageSelect("B", e)}
          onImageRemove={() => form.handleImageRemove("B")}
          imageBusy={form.imageCompressingSide === "B"}
        />

        <section>
          <h2 className="mb-1 text-sm font-bold text-gray-900">質問の理由</h2>
          <div className="rounded-xl bg-white p-5">
            <textarea
              value={form.reason}
              onChange={(e) => form.setReason(e.target.value)}
              placeholder="例) 家族でパンvsご飯にわかれます。世の中のみんながどっち派か教えて。決着つけたい。"
              className="min-h-[80px] w-full resize-none border-0 bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400"
            />
          </div>
          <div className="mt-[10px]">
            <Checkbox checked={form.noComments} onChange={form.setNoComments} label="コメントを求めない" />
          </div>
        </section>

        <VoteFormTagsSection
          tags={form.tags}
          onTagsChange={form.setTags}
          tagInput={form.tagInput}
          onTagInputChange={form.setTagInput}
        />

        <VoteFormBackgroundPicker
          selectedUrl={form.selectedBackgroundUrl}
          onSelect={form.setSelectedBackgroundUrl}
        />

        <VoteFormPeriodSection
          useVotePeriod={form.useVotePeriod}
          onUseVotePeriodChange={form.setUseVotePeriod}
          startYear={form.startYear}
          startMonth={form.startMonth}
          startDay={form.startDay}
          endYear={form.endYear}
          endMonth={form.endMonth}
          endDay={form.endDay}
          onStartYearChange={form.setStartYear}
          onStartMonthChange={form.setStartMonth}
          onStartDayChange={form.setStartDay}
          onEndYearChange={form.setEndYear}
          onEndMonthChange={form.setEndMonth}
          onEndDayChange={form.setEndDay}
        />

        {isCollectionVoteCardAddEnabled() ? (
          <section>
            <h2 className="mb-1 flex items-center gap-1 text-sm font-bold text-gray-900">
              コレクション
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-200 text-xs text-gray-600">
                ?
              </span>
            </h2>
            <button
              type="button"
              onClick={() => form.setCollectionPickerOpen(true)}
              className="flex w-full items-center rounded-[9999px] border border-gray-200 bg-white px-4 py-3 text-left"
            >
              <span
                className={`min-w-0 flex-1 text-sm ${form.selectedCollectionLabel ? "text-gray-900" : "text-gray-400"}`}
              >
                {form.selectedCollectionLabel ?? "追加したいコレクションを選択"}
              </span>
              <span className="ml-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#FFE100]">
                <img src="/icons/icon_b_arrow.svg" alt="" className="h-1.5 w-2" width={8} height={6} />
              </span>
            </button>
          </section>
        ) : null}
      </main>

      {isCollectionVoteCardAddEnabled() ? (
        <CollectionPickerSheet
          open={form.collectionPickerOpen}
          onClose={() => form.setCollectionPickerOpen(false)}
          title="コレクションを選ぶ"
          scope={isModal ? "contained" : "viewport"}
          mode="select"
          selectedIds={form.selectedCollectionIds}
          onSelectedIdsChange={form.setSelectedCollectionIds}
          onCreateNew={() => {
            form.setCollectionPickerOpen(false);
            form.setShowCollectionSettingsModal(true);
          }}
        />
      ) : null}

      {isCollectionVoteCardAddEnabled() && form.showCollectionSettingsModal ? (
        <CollectionSettingsModal
          onClose={() => form.setShowCollectionSettingsModal(false)}
          onSave={async (name, gradient, visibility, category, coverImageUrl) => {
            const created = await createOwnedCollectionFromSettings(name, {
              gradient,
              visibility,
              category,
              coverImageUrl,
            });
            form.setSelectedCollectionIds((prev) =>
              prev.includes(created.id) ? prev : [...prev, created.id]
            );
            form.setShowCollectionSettingsModal(false);
            form.setCollectionPickerOpen(true);
          }}
        />
      ) : null}

      <div
        className={
          isModal
            ? "shrink-0 border-t border-gray-200 bg-[#F1F1F1] px-[5.333vw] py-3"
            : "fixed bottom-14 left-0 right-0 z-20 mx-auto max-w-lg px-[5.333vw] pb-2 pt-2"
        }
      >
        <Button
          variant="createVote"
          type="button"
          onClick={form.handleSubmit}
          disabled={!form.canSubmit || form.isSubmitting}
        >
          {form.isSubmitting ? "作成中..." : "VOTEを作成"}
        </Button>
      </div>
    </div>
  );
}

export default function CreateVoteFormContentWithSuspense({
  variant = "page",
  onClose,
}: {
  variant?: "page" | "modal";
  onClose?: () => void;
}) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[200px] items-center justify-center bg-[#F1F1F1] text-sm text-gray-500">
          読み込み中...
        </div>
      }
    >
      <CreateVoteFormContent variant={variant} onClose={onClose} />
    </Suspense>
  );
}

export { CreateVoteFormContent };
