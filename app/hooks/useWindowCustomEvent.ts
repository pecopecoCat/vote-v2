"use client";

import { useEffect } from "react";

/** window の CustomEvent を購読（auth / collections 更新など） */
export function useWindowCustomEvent(eventName: string, handler: () => void): void {
  useEffect(() => {
    window.addEventListener(eventName, handler);
    return () => window.removeEventListener(eventName, handler);
  }, [eventName, handler]);
}
