/** ピン留め ID 順でコレクション一覧を並べ替え */
export function sortCollectionsByPinned<T extends { id: string }>(
  items: T[],
  pinnedCollectionIds: string[]
): T[] {
  return [...items].sort((a, b) => {
    const aPin = pinnedCollectionIds.includes(a.id);
    const bPin = pinnedCollectionIds.includes(b.id);
    if (aPin && !bPin) return -1;
    if (!aPin && bPin) return 1;
    if (aPin && bPin) {
      return pinnedCollectionIds.indexOf(a.id) - pinnedCollectionIds.indexOf(b.id);
    }
    return 0;
  });
}
