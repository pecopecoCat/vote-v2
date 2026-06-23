import { getAuth } from "../data/auth";
import { addBookmark, isCardBookmarked, removeBookmark } from "../data/bookmarks";
import { showAppToast } from "./appToast";

export type ToggleBookmarkResult = "added" | "removed" | "login_required";

/** ブックマークの保存／解除（トーストのみ。コミュニティへの追加は別動線） */
export function toggleBookmark(
  cardId: string,
  opts?: { onAdded?: () => void }
): ToggleBookmarkResult {
  if (!getAuth().isLoggedIn) return "login_required";
  if (isCardBookmarked(cardId)) {
    removeBookmark(cardId);
    showAppToast("bookmark解除しました");
    return "removed";
  }
  addBookmark(cardId);
  showAppToast("bookmarkしました");
  opts?.onAdded?.();
  return "added";
}
