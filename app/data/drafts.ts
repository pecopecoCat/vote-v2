/**
 * 下書き（VOTE作成画面の一時保存）
 * localStorage で永続化。ゴミ箱で削除。
 */

const STORAGE_KEY = "vote_drafts";

export type DraftVisibility = "public" | "private";

export interface DraftData {
  question: string;
  optionA: string;
  optionB: string;
  optionAImageUrl?: string;
  optionBImageUrl?: string;
  reason?: string;
  noComments?: boolean;
  tags?: string[];
  selectedBackgroundUrl?: string;
  selectedCollectionId?: string;
  visibility?: DraftVisibility;
  useVotePeriod?: boolean;
  startYear?: number;
  startMonth?: number;
  startDay?: number;
  endYear?: number;
  endMonth?: number;
  endDay?: number;
}

export interface DraftItem {
  id: string;
  /** 一覧表示用タイトル（基本は question） */
  title: string;
  /** 保存日時（ISO）。一覧の並び用 */
  savedAt: string;
  /** 作成フォームの入力を丸ごと保持 */
  data: DraftData;
}

type LegacyDraftItem = { id: string; text: string; savedAt: string };

function normalizeDraft(raw: unknown): DraftItem | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const id = typeof o.id === "string" ? o.id : "";
  const savedAt = typeof o.savedAt === "string" ? o.savedAt : new Date().toISOString();
  // 新形式
  if (typeof o.title === "string" && o.data && typeof o.data === "object") {
    const dataObj = o.data as Record<string, unknown>;
    const question = typeof dataObj.question === "string" ? dataObj.question : "";
    const optionA = typeof dataObj.optionA === "string" ? dataObj.optionA : "";
    const optionB = typeof dataObj.optionB === "string" ? dataObj.optionB : "";
    const title = o.title.trim() || question.trim() || "（未入力）";
    return {
      id: id || `draft-${Date.now()}`,
      title,
      savedAt,
      data: {
        question,
        optionA,
        optionB,
        optionAImageUrl: typeof dataObj.optionAImageUrl === "string" ? dataObj.optionAImageUrl : undefined,
        optionBImageUrl: typeof dataObj.optionBImageUrl === "string" ? dataObj.optionBImageUrl : undefined,
        reason: typeof dataObj.reason === "string" ? dataObj.reason : undefined,
        noComments: typeof dataObj.noComments === "boolean" ? dataObj.noComments : undefined,
        tags: Array.isArray(dataObj.tags) ? (dataObj.tags.filter((t): t is string => typeof t === "string") as string[]) : undefined,
        selectedBackgroundUrl: typeof dataObj.selectedBackgroundUrl === "string" ? dataObj.selectedBackgroundUrl : undefined,
        selectedCollectionId: typeof dataObj.selectedCollectionId === "string" ? dataObj.selectedCollectionId : undefined,
        visibility: dataObj.visibility === "private" ? "private" : dataObj.visibility === "public" ? "public" : undefined,
        useVotePeriod: typeof dataObj.useVotePeriod === "boolean" ? dataObj.useVotePeriod : undefined,
        startYear: typeof dataObj.startYear === "number" ? dataObj.startYear : undefined,
        startMonth: typeof dataObj.startMonth === "number" ? dataObj.startMonth : undefined,
        startDay: typeof dataObj.startDay === "number" ? dataObj.startDay : undefined,
        endYear: typeof dataObj.endYear === "number" ? dataObj.endYear : undefined,
        endMonth: typeof dataObj.endMonth === "number" ? dataObj.endMonth : undefined,
        endDay: typeof dataObj.endDay === "number" ? dataObj.endDay : undefined,
      },
    };
  }
  // 旧形式（question 文字列のみ）
  const text = typeof o.text === "string" ? o.text.trim() : "";
  if (!text) return null;
  return {
    id: id || `draft-${Date.now()}`,
    title: text,
    savedAt,
    data: { question: text, optionA: "", optionB: "" },
  };
}

function load(): DraftItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const out: DraftItem[] = [];
    for (const it of parsed) {
      const n = normalizeDraft(it);
      if (n) out.push(n);
    }
    return out;
  } catch {
    return [];
  }
}

function save(list: DraftItem[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // ignore
  }
}

/** 下書き一覧（保存日時降順） */
export function getDrafts(): DraftItem[] {
  const list = load();
  return [...list].sort((a, b) => (b.savedAt ?? "").localeCompare(a.savedAt ?? ""));
}

export function getDraftById(id: string): DraftItem | null {
  if (!id) return null;
  return load().find((d) => d.id === id) ?? null;
}

/** 下書きを1件追加（フォーム入力を丸ごと保存） */
export function addDraft(data: DraftData): void {
  const list = load();
  const q = (data.question ?? "").trim();
  const title = q || "（未入力）";
  const item: DraftItem = {
    id: `draft-${Date.now()}`,
    title,
    savedAt: new Date().toISOString(),
    data: {
      question: q,
      optionA: (data.optionA ?? "").trim(),
      optionB: (data.optionB ?? "").trim(),
      optionAImageUrl: typeof data.optionAImageUrl === "string" ? data.optionAImageUrl : undefined,
      optionBImageUrl: typeof data.optionBImageUrl === "string" ? data.optionBImageUrl : undefined,
      reason: typeof data.reason === "string" ? data.reason : undefined,
      noComments: Boolean(data.noComments),
      tags: Array.isArray(data.tags) ? data.tags.filter((t) => typeof t === "string" && t.trim()).map((t) => t.trim()) : [],
      selectedBackgroundUrl: typeof data.selectedBackgroundUrl === "string" ? data.selectedBackgroundUrl : undefined,
      selectedCollectionId: typeof data.selectedCollectionId === "string" ? data.selectedCollectionId : undefined,
      visibility: data.visibility === "private" ? "private" : "public",
      useVotePeriod: Boolean(data.useVotePeriod),
      startYear: typeof data.startYear === "number" ? data.startYear : undefined,
      startMonth: typeof data.startMonth === "number" ? data.startMonth : undefined,
      startDay: typeof data.startDay === "number" ? data.startDay : undefined,
      endYear: typeof data.endYear === "number" ? data.endYear : undefined,
      endMonth: typeof data.endMonth === "number" ? data.endMonth : undefined,
      endDay: typeof data.endDay === "number" ? data.endDay : undefined,
    },
  };
  // question だけでも保存可能（後で続きを書ける）
  save([item, ...list]);
}

/** 下書きを1件削除（ゴミ箱タップ） */
export function deleteDraft(id: string): void {
  const list = load().filter((d) => d.id !== id);
  save(list);
}
