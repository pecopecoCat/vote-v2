"use client";

export interface AdCardProps {
  brandName: string;
  caption: string;
  imageUrl?: string;
}

export default function AdCard({
  brandName,
  caption,
  imageUrl,
}: AdCardProps) {
  return (
    <article className="relative w-full overflow-hidden rounded-[18px] bg-gray-200 shadow-[0_2px_1px_0_rgba(51,51,51,0.1)]">
      {/* 画像エリア（VOTE CARD と角丸統一） */}
      <div
        className={`flex min-h-[160px] items-end justify-start bg-cover bg-center bg-no-repeat p-4 ${
          imageUrl ? "" : "bg-gradient-to-br from-red-400/90 via-red-500/80 to-green-600/90"
        }`}
        style={imageUrl ? { backgroundImage: `url(${imageUrl})` } : undefined}
      >
        <div className="relative z-10">
          <p className="text-2xl font-serif font-bold tracking-wide text-white drop-shadow-md">
            {brandName}
          </p>
          <p className="text-sm text-white/95">{caption}</p>
        </div>
      </div>
      <span className="absolute right-3 top-3 rounded-md bg-white/95 px-2 py-0.5 text-xs font-medium text-gray-800">
        PR
      </span>
    </article>
  );
}
