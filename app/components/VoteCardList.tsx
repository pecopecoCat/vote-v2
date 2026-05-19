import type { ReactNode } from "react";

type VoteCardListProps = {
  children: ReactNode;
  className?: string;
};

/** VOTEカード一覧の共通レイアウト（余白統一・シャドウが親で切れないよう overflow は visible） */
export function VoteCardList({ children, className = "" }: VoteCardListProps) {
  const extra = className ? ` ${className}` : "";
  return <div className={`vote-card-list${extra}`}>{children}</div>;
}
