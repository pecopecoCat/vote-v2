"use client";

import { useRef } from "react";
import OptionAnswerImageControl from "./OptionAnswerImageControl";
import { OPTION_MAX } from "./createVoteFormConstants";

type VoteFormOptionFieldProps = {
  side: "A" | "B";
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  imageUrl?: string;
  onImageSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onImageRemove: () => void;
  imageBusy?: boolean;
};

export default function VoteFormOptionField({
  side,
  label,
  placeholder,
  value,
  onChange,
  imageUrl,
  onImageSelect,
  onImageRemove,
  imageBusy = false,
}: VoteFormOptionFieldProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <section>
      <h2 className="mb-1 text-sm font-bold text-gray-900">
        {label}（{OPTION_MAX}文字以内） <span className="text-red-600">*</span>
      </h2>
      <div className="relative rounded-xl bg-white p-5 pr-[60px]">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value.slice(0, OPTION_MAX))}
          placeholder={placeholder}
          className="w-full border-0 bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400"
        />
        <OptionAnswerImageControl
          side={side}
          imageUrl={imageUrl}
          fileInputRef={fileInputRef}
          onSelect={onImageSelect}
          onRemove={onImageRemove}
          busy={imageBusy}
        />
      </div>
    </section>
  );
}
