import type { ReactNode } from "react";

type VoteCardListProps = {
  children: ReactNode;
  className?: string;
  /** HOME と同じ横埋めグリッド（640px〜で2列…）。各カードは VoteCardMasonryTile で包む */
  masonry?: boolean;
};

/** VOTEカード一覧の共通レイアウト（余白統一・シャドウが親で切れないよう overflow は visible） */
export function VoteCardList({ children, className = "", masonry = false }: VoteCardListProps) {
  const extra = className ? ` ${className}` : "";
  const masonryClass = masonry ? " home-feed-masonry" : "";
  return <div className={`vote-card-list${masonryClass}${extra}`}>{children}</div>;
}

type VoteCardMasonryTileProps = {
  children: ReactNode;
  /** タグ行・空状態など1行フル幅 */
  fullWidth?: boolean;
  className?: string;
};

export function VoteCardMasonryTile({ children, fullWidth = false, className = "" }: VoteCardMasonryTileProps) {
  const extra = className ? ` ${className}` : "";
  return (
    <div
      className={`home-feed-masonry__tile${fullWidth ? " home-feed-masonry__tile--full" : ""}${extra}`}
    >
      {children}
    </div>
  );
}
