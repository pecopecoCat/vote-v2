"use client";

import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

/** App Router の履歴で戻れるか（直リンクなどで履歴が無い場合は false） */
export function canNavigateBack(): boolean {
  if (typeof window === "undefined") return false;
  const state = window.history.state as { idx?: number } | null;
  if (state && typeof state.idx === "number") return state.idx > 0;
  return window.history.length > 1;
}

/**
 * 1つ前の画面へ戻る。履歴が無いときだけ fallbackHref へ遷移する。
 */
export function navigateBack(router: AppRouterInstance, options?: { fallbackHref?: string }): void {
  const fallback = options?.fallbackHref ?? "/";
  if (canNavigateBack()) {
    router.back();
    return;
  }
  router.push(fallback);
}
