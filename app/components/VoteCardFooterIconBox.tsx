import type { ReactNode } from "react";

/** VOTEカードフッター：アイコンを同じ枠内に収めて見た目のサイズを揃える */
export function VoteCardFooterIconBox({ children }: { children: ReactNode }) {
  return <span className="vote-card-footer-icon-box">{children}</span>;
}
