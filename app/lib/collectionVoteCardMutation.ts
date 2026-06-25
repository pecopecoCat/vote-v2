/** コレクションへの VOTE カード追加を許可するか（UI・データ層・API で共通） */
export const COLLECTION_VOTE_CARD_ADD_ENABLED = true;

/** コレクションからの VOTE カード削除を許可するか（UI・データ層・API で共通） */
export const COLLECTION_VOTE_CARD_REMOVE_ENABLED = false;

export function isCollectionVoteCardAddEnabled(): boolean {
  return COLLECTION_VOTE_CARD_ADD_ENABLED;
}

export function isCollectionVoteCardRemoveEnabled(): boolean {
  return COLLECTION_VOTE_CARD_REMOVE_ENABLED;
}
