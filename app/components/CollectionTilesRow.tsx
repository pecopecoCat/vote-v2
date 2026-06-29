"use client";

import { forwardRef, useCallback, useImperativeHandle, useMemo, useState } from "react";
import CollectionListTile from "./CollectionListTile";
import CollectionOptionsModal from "./CollectionOptionsModal";
import CollectionSettingsModal from "./CollectionSettingsModal";
import MemberCollectionShareSheet from "./MemberCollectionShareSheet";
import {
  deleteCollection,
  isCollectionPinnable,
  syncCollectionToApiAndWait,
  togglePinnedCollection,
  type Collection,
} from "../data/collections";
import type { CollectionGradient } from "../data/search";
import {
  getCollectionMenuModalProps,
  shouldShowCollectionTileMenu,
  type CollectionTileMenuFilter,
} from "../lib/collectionTileMenu";

export type CollectionTilesRowHandle = {
  openCreateSettings: () => void;
};

export type CollectionTilesRowProps = {
  collections: Collection[];
  thumbnailById: Map<string, string | null>;
  localCollections: Collection[];
  activityUserId: string;
  pinnedCollectionIds?: string[];
  showPin?: boolean;
  /** マイページ: library / コレクション一覧: owned */
  menuFilter?: CollectionTileMenuFilter;
  getHref?: (collection: Collection) => string;
  onRefresh: () => void;
  onDeleted?: (collectionId: string) => void;
  onSettingsSave: (
    editing: Collection | null,
    name: string,
    gradient: CollectionGradient,
    visibility: Collection["visibility"],
    coverImageUrl?: string
  ) => void | Promise<void>;
  className?: string;
};

const CollectionTilesRow = forwardRef<CollectionTilesRowHandle, CollectionTilesRowProps>(
  function CollectionTilesRow(
    {
      collections,
      thumbnailById,
      localCollections,
      activityUserId,
      pinnedCollectionIds = [],
      showPin = false,
      menuFilter = "library",
      getHref = (col) => `/collection/${col.id}`,
      onRefresh,
      onDeleted,
      onSettingsSave,
      className = "collections-scroll-row",
    },
    ref
  ) {
    const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
    const [shareSheetCollectionId, setShareSheetCollectionId] = useState<string | null>(null);
    const [editingCollection, setEditingCollection] = useState<Collection | null>(null);
    const [showSettings, setShowSettings] = useState(false);

    useImperativeHandle(ref, () => ({
      openCreateSettings: () => {
        setEditingCollection(null);
        setShowSettings(true);
      },
    }));

    const menuCollection = useMemo(() => {
      if (!menuOpenId) return null;
      return (
        localCollections.find((c) => c.id === menuOpenId) ??
        collections.find((c) => c.id === menuOpenId) ??
        null
      );
    }, [collections, localCollections, menuOpenId]);

    const menuModalProps = getCollectionMenuModalProps(menuCollection ?? undefined);

    const handlePinToggle = useCallback(
      (collectionId: string) => {
        togglePinnedCollection(collectionId);
        onRefresh();
      },
      [onRefresh]
    );

    const handleShare = useCallback(async () => {
      if (!menuOpenId) return;
      const col = localCollections.find((c) => c.id === menuOpenId);
      if (!col || col.visibility !== "member") return;
      const ok = await syncCollectionToApiAndWait(col);
      if (ok) setShareSheetCollectionId(menuOpenId);
    }, [localCollections, menuOpenId]);

    const handleDelete = useCallback(() => {
      if (!menuOpenId) return;
      deleteCollection(menuOpenId);
      onRefresh();
      onDeleted?.(menuOpenId);
      setMenuOpenId(null);
    }, [menuOpenId, onDeleted, onRefresh]);

    const openEditSettings = useCallback((col: Collection) => {
      const local = localCollections.find((c) => c.id === col.id) ?? col;
      setEditingCollection(local);
      setShowSettings(true);
    }, [localCollections]);

    return (
      <>
        <div className={className}>
          {collections.map((col) => {
            const canPin = showPin && isCollectionPinnable(col.visibility);
            const showMenu = shouldShowCollectionTileMenu(
              col,
              activityUserId,
              localCollections,
              menuFilter
            );
            return (
              <CollectionListTile
                key={col.id}
                collection={col}
                thumbnailUrl={thumbnailById.get(col.id)}
                href={getHref(col)}
                canPin={canPin}
                isPinned={canPin && pinnedCollectionIds.includes(col.id)}
                showMenu={showMenu}
                onPinToggle={() => handlePinToggle(col.id)}
                onMenuClick={() => setMenuOpenId(col.id)}
              />
            );
          })}
        </div>

        {menuOpenId != null && menuCollection ? (
          <CollectionOptionsModal
            showShare={menuModalProps.showShare}
            onShare={() => void handleShare()}
            hideEdit={menuModalProps.hideEdit}
            deleteLabel={menuModalProps.deleteLabel}
            onClose={() => setMenuOpenId(null)}
            onEdit={() => {
              openEditSettings(menuCollection);
              setMenuOpenId(null);
            }}
            onDelete={handleDelete}
          />
        ) : null}

        {shareSheetCollectionId != null ? (
          <MemberCollectionShareSheet
            open
            onClose={() => setShareSheetCollectionId(null)}
            collectionId={shareSheetCollectionId}
          />
        ) : null}

        {showSettings ? (
          <CollectionSettingsModal
            editingCollection={editingCollection}
            onClose={() => {
              setShowSettings(false);
              setEditingCollection(null);
            }}
            onSave={async (name, gradient, visibility, coverImageUrl) => {
              await onSettingsSave(
                editingCollection,
                name,
                gradient,
                visibility,
                coverImageUrl
              );
              setShowSettings(false);
              setEditingCollection(null);
            }}
          />
        ) : null}
      </>
    );
  }
);

export default CollectionTilesRow;
