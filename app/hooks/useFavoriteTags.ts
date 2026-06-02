"use client";

import { useCallback, useState, type Dispatch, type SetStateAction } from "react";
import { getFavoriteTags, getFavoriteTagsUpdatedEventName } from "../data/favoriteTags";
import { useWindowCustomEvent } from "./useWindowCustomEvent";

export function useFavoriteTags(): {
  favoriteTags: string[];
  setFavoriteTags: Dispatch<SetStateAction<string[]>>;
  refreshFavoriteTags: () => void;
} {
  const [favoriteTags, setFavoriteTags] = useState<string[]>(() => getFavoriteTags());
  const refreshFavoriteTags = useCallback(() => setFavoriteTags(getFavoriteTags()), []);
  useWindowCustomEvent(getFavoriteTagsUpdatedEventName(), refreshFavoriteTags);
  return { favoriteTags, setFavoriteTags, refreshFavoriteTags };
}
