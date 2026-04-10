/**
 * 空状態用：白背景・角丸は VoteCard と同じ 18px・シャドウなし（タグ検索0件／コメント0件など）
 */
export default function EmptyStatePanel({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-[18px] bg-white px-6 py-12 text-center ${className}`.trim()}
    >
      {children}
    </div>
  );
}
