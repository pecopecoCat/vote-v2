import { removeBookmark } from "./bookmarks";
import { getCollections, removeCardFromCollection } from "./collections";

/** Bookmark リストから外し、全コレクションからも当該カードを削除する（モーダル「Bookmarkから外す」と同等） */
export function removeBookmarkFully(cardId: string): void {
  getCollections().forEach((col) => {
    if (col.cardIds.includes(cardId)) removeCardFromCollection(col.id, cardId);
  });
  removeBookmark(cardId);
}
