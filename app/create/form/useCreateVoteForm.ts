"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { addCardToContributableCollection } from "../../data/collections";
import { getAuth, getCurrentActivityUserId } from "../../data/auth";
import { CARD_BACKGROUND_IMAGES } from "../../data/voteCards";
import { useSharedData } from "../../context/SharedDataContext";
import { addDraft, getDraftById } from "../../data/drafts";
import { useContributableCollections } from "../../hooks/useContributableCollections";
import { PENDING_VOTE_CREATED_TOAST_KEY, showAppToast } from "../../lib/appToast";
import { compressImageFile } from "../../lib/compressImageFile";
import { CURRENT_YEAR, QUESTION_MAX } from "./createVoteFormConstants";

type UseCreateVoteFormOptions = {
  qFromUrl?: string;
  draftIdFromUrl?: string;
};

export function useCreateVoteForm({ qFromUrl = "", draftIdFromUrl = "" }: UseCreateVoteFormOptions) {
  const router = useRouter();
  const { addCreatedVote: sharedAddCreatedVote } = useSharedData();
  const draftLoadedRef = useRef(false);

  const [question, setQuestion] = useState(qFromUrl);
  const [optionA, setOptionA] = useState("");
  const [optionB, setOptionB] = useState("");
  const [optionAImageUrl, setOptionAImageUrl] = useState<string | undefined>(undefined);
  const [optionBImageUrl, setOptionBImageUrl] = useState<string | undefined>(undefined);
  const [imageCompressingSide, setImageCompressingSide] = useState<"A" | "B" | null>(null);
  const [reason, setReason] = useState("");
  const [noComments, setNoComments] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedBackgroundUrl, setSelectedBackgroundUrl] = useState<string>(CARD_BACKGROUND_IMAGES[0]);
  const [selectedCollectionIds, setSelectedCollectionIds] = useState<string[]>([]);
  const [collectionPickerOpen, setCollectionPickerOpen] = useState(false);
  const [showCollectionSettingsModal, setShowCollectionSettingsModal] = useState(false);
  const [showQuestionStep, setShowQuestionStep] = useState(false);
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

  const collectionsQueryEnabled = collectionPickerOpen || selectedCollectionIds.length > 0;
  const { rows: contributableRows } = useContributableCollections(undefined, {
    enabled: collectionsQueryEnabled,
  });

  const selectedCollectionLabel = useMemo(() => {
    if (selectedCollectionIds.length === 0) return null;
    const names = selectedCollectionIds
      .map((id) => contributableRows.find((r) => r.id === id)?.name)
      .filter((name): name is string => Boolean(name));
    if (names.length === 0) {
      return `${selectedCollectionIds.length}件選択中`;
    }
    if (selectedCollectionIds.length === 1) return names[0];
    return `${names[0]} ほか${selectedCollectionIds.length - 1}件`;
  }, [selectedCollectionIds, contributableRows]);

  useEffect(() => {
    if (!draftLoadedRef.current && qFromUrl) setQuestion(qFromUrl);
  }, [qFromUrl]);

  useEffect(() => {
    if (!draftIdFromUrl) return;
    const d = getDraftById(draftIdFromUrl);
    if (!d) return;
    const data = d.data;
    draftLoadedRef.current = true;
    setQuestion(data.question ?? "");
    setOptionA(data.optionA ?? "");
    setOptionB(data.optionB ?? "");
    setOptionAImageUrl(data.optionAImageUrl || undefined);
    setOptionBImageUrl(data.optionBImageUrl || undefined);
    setReason(data.reason ?? "");
    setNoComments(Boolean(data.noComments));
    setTags(Array.isArray(data.tags) ? data.tags : []);
    setTagInput("");
    if (typeof data.selectedBackgroundUrl === "string" && data.selectedBackgroundUrl.length > 0) {
      setSelectedBackgroundUrl(data.selectedBackgroundUrl);
    }
    const draftIds = Array.isArray(data.selectedCollectionIds)
      ? data.selectedCollectionIds
      : data.selectedCollectionId
        ? [data.selectedCollectionId]
        : [];
    setSelectedCollectionIds(draftIds);
    setVisibility(data.visibility === "private" ? "private" : "public");
    setUseVotePeriod(Boolean(data.useVotePeriod));
    if (typeof data.startYear === "number") setStartYear(data.startYear);
    if (typeof data.startMonth === "number") setStartMonth(data.startMonth);
    if (typeof data.startDay === "number") setStartDay(data.startDay);
    if (typeof data.endYear === "number") setEndYear(data.endYear);
    if (typeof data.endMonth === "number") setEndMonth(data.endMonth);
    if (typeof data.endDay === "number") setEndDay(data.endDay);
  }, [draftIdFromUrl]);

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
    if (!canSubmit || isSubmitting) return;
    if (!getAuth().isLoggedIn) return;
    setIsSubmitting(true);
    const now = new Date().toISOString();
    const tagList = tags.length > 0 ? tags : undefined;
    const periodStart = useVotePeriod
      ? new Date(startYear, startMonth - 1, startDay, 0, 0, 0, 0).toISOString()
      : undefined;
    const periodEnd = useVotePeriod
      ? new Date(endYear, endMonth - 1, endDay, 23, 59, 59, 999).toISOString()
      : undefined;
    const userId = getCurrentActivityUserId();
    const card = {
      id: `created-${Date.now()}`,
      patternType: "yellow-loops" as const,
      backgroundImageUrl: selectedBackgroundUrl,
      question: question.trim(),
      optionA: optionA.trim(),
      optionB: optionB.trim(),
      countA: 0,
      countB: 0,
      commentCount: 0,
      tags: tagList,
      readMoreText: reason.trim() ? reason.trim() : undefined,
      createdAt: now,
      visibility,
      optionAImageUrl: optionAImageUrl || undefined,
      optionBImageUrl: optionBImageUrl || undefined,
      periodStart,
      periodEnd,
      createdByUserId: userId || undefined,
      commentsDisabled: noComments ? true : undefined,
    };
    void sharedAddCreatedVote(card)
      .then(async () => {
        for (const collectionId of selectedCollectionIds) {
          await addCardToContributableCollection(collectionId, card.id);
        }
        try {
          sessionStorage.setItem(PENDING_VOTE_CREATED_TOAST_KEY, "1");
        } catch {
          /* ignore */
        }
        router.push("/?tab=new");
      })
      .catch((e) => {
        const msg = e instanceof Error ? e.message : "サーバーへの保存に失敗しました。";
        showAppToast(msg, "error");
      })
      .finally(() => setIsSubmitting(false));
  }, [
    canSubmit,
    sharedAddCreatedVote,
    router,
    question,
    optionA,
    optionB,
    optionAImageUrl,
    optionBImageUrl,
    reason,
    tags,
    selectedBackgroundUrl,
    visibility,
    isSubmitting,
    useVotePeriod,
    startYear,
    startMonth,
    startDay,
    endYear,
    endMonth,
    endDay,
    selectedCollectionIds,
    noComments,
  ]);

  const handleSaveDraftAndGoToDrafts = useCallback(() => {
    addDraft({
      question,
      optionA,
      optionB,
      optionAImageUrl,
      optionBImageUrl,
      reason,
      noComments,
      tags,
      selectedBackgroundUrl,
      selectedCollectionIds,
      visibility,
      useVotePeriod,
      startYear,
      startMonth,
      startDay,
      endYear,
      endMonth,
      endDay,
    });
    router.push("/drafts");
  }, [
    question,
    optionA,
    optionB,
    optionAImageUrl,
    optionBImageUrl,
    reason,
    noComments,
    tags,
    selectedBackgroundUrl,
    selectedCollectionIds,
    visibility,
    useVotePeriod,
    startYear,
    startMonth,
    startDay,
    endYear,
    endMonth,
    endDay,
    router,
  ]);

  const handleImageSelect = useCallback((side: "A" | "B", e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setImageCompressingSide(side);
    void compressImageFile(file)
      .then((dataUrl) => {
        if (side === "A") setOptionAImageUrl(dataUrl);
        else setOptionBImageUrl(dataUrl);
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : "画像の処理に失敗しました。";
        showAppToast(msg, "error");
      })
      .finally(() => setImageCompressingSide(null));
  }, []);

  const handleImageRemove = useCallback((side: "A" | "B") => {
    if (side === "A") setOptionAImageUrl(undefined);
    else setOptionBImageUrl(undefined);
  }, []);

  return {
    question,
    setQuestion,
    optionA,
    setOptionA,
    optionB,
    setOptionB,
    optionAImageUrl,
    optionBImageUrl,
    imageCompressingSide,
    reason,
    setReason,
    noComments,
    setNoComments,
    tags,
    setTags,
    tagInput,
    setTagInput,
    isSubmitting,
    selectedBackgroundUrl,
    setSelectedBackgroundUrl,
    selectedCollectionIds,
    setSelectedCollectionIds,
    collectionPickerOpen,
    setCollectionPickerOpen,
    showCollectionSettingsModal,
    setShowCollectionSettingsModal,
    showQuestionStep,
    setShowQuestionStep,
    useVotePeriod,
    setUseVotePeriod,
    startYear,
    setStartYear,
    startMonth,
    setStartMonth,
    startDay,
    setStartDay,
    endYear,
    setEndYear,
    endMonth,
    setEndMonth,
    endDay,
    setEndDay,
    selectedCollectionLabel,
    canSubmit,
    handleSubmit,
    handleSaveDraftAndGoToDrafts,
    handleImageSelect,
    handleImageRemove,
  };
}
