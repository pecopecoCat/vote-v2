"use client";

type OptionAnswerImageControlProps = {
  side: "A" | "B";
  imageUrl?: string;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemove: () => void;
  busy?: boolean;
};

export default function OptionAnswerImageControl({
  side,
  imageUrl,
  fileInputRef,
  onSelect,
  onRemove,
  busy = false,
}: OptionAnswerImageControlProps) {
  const label = side === "A" ? "A" : "B";
  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        aria-label={`${label}の画像を選択`}
        onChange={onSelect}
        disabled={busy}
      />
      {imageUrl ? (
        <div className="absolute right-5 top-1/2 z-10 -translate-y-1/2">
          <div className="relative h-10 w-10">
            <button
              type="button"
              disabled={busy}
              onClick={() => !busy && fileInputRef.current?.click()}
              className="flex h-10 w-10 cursor-pointer overflow-hidden rounded-[10px] hover:opacity-90 disabled:cursor-wait disabled:opacity-60"
              aria-label={`${label}の画像を変更`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl}
                alt=""
                className="h-full w-full object-cover"
                loading="lazy"
                decoding="async"
              />
            </button>
            <button
              type="button"
              onClick={onRemove}
              className="absolute -right-1 -top-1 z-20 flex h-4 w-4 cursor-pointer items-center justify-center rounded-full border border-white bg-[#333333] text-[10px] font-bold leading-none text-white shadow-sm hover:bg-[#191919]"
              aria-label={`${label}の画像を削除`}
            >
              ×
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={() => !busy && fileInputRef.current?.click()}
          className="absolute right-5 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-[10px] bg-[#D9D9D9] hover:opacity-90 disabled:cursor-wait disabled:opacity-60"
          aria-label={`${label}の画像を設定`}
        >
          <span
            className="block h-[17.5px] w-5 shrink-0 pointer-events-none"
            style={{
              backgroundColor: "#787878",
              mask: "url(/icons/icon_photo.svg) no-repeat center/contain",
              WebkitMask: "url(/icons/icon_photo.svg) no-repeat center/contain",
            }}
          />
        </button>
      )}
    </>
  );
}
