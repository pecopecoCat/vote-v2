"use client";

import { useEffect } from "react";
import { useSharedData } from "../context/SharedDataContext";

/** コレクション／ブックマークの KV 同期が必要な画面で1回だけ呼ぶ */
export function useEnsureCollectionsHydrated(enabled = true): void {
  const { ensureCollectionsHydrated } = useSharedData();
  useEffect(() => {
    if (!enabled) return;
    void ensureCollectionsHydrated();
  }, [enabled, ensureCollectionsHydrated]);
}
