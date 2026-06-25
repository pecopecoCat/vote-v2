"use client";

import { useMemo } from "react";
import ShareSheet, { useSharePageUrl } from "./ShareSheet";

export interface MemberCollectionShareSheetProps {
  open: boolean;
  onClose: () => void;
  collectionId: string;
}

export default function MemberCollectionShareSheet({
  open,
  onClose,
  collectionId,
}: MemberCollectionShareSheetProps) {
  const pageUrl = useSharePageUrl(
    useMemo(() => `/collection/${encodeURIComponent(collectionId)}`, [collectionId])
  );

  return <ShareSheet open={open} onClose={onClose} pageUrl={pageUrl} title="共有" variant="collection" />;
}
