"use client";

import { recommendedTagList } from "../../data/voteCards";

function MagnifyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
      />
    </svg>
  );
}

type VoteFormTagsSectionProps = {
  tags: string[];
  onTagsChange: (tags: string[]) => void;
  tagInput: string;
  onTagInputChange: (value: string) => void;
};

export default function VoteFormTagsSection({
  tags,
  onTagsChange,
  tagInput,
  onTagInputChange,
}: VoteFormTagsSectionProps) {
  const addTag = (tag: string) => {
    if (!tags.includes(tag)) onTagsChange([...tags, tag]);
    onTagInputChange("");
  };

  return (
    <section>
      <h2 className="mb-2 text-sm font-bold text-gray-900">タグ付け</h2>
      <div className="relative rounded-xl bg-white p-5">
        {tags.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 rounded-full bg-gray-200 px-3 py-1.5 text-sm text-gray-900"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => onTagsChange(tags.filter((t) => t !== tag))}
                  className="ml-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-gray-500 hover:bg-gray-300 hover:text-gray-700"
                  aria-label={`${tag} を削除`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
        <div className="flex items-center gap-2">
          <MagnifyIcon className="h-5 w-5 shrink-0 text-gray-400" />
          <input
            type="text"
            value={tagInput}
            onChange={(e) => onTagInputChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                const word = tagInput.trim();
                if (word) addTag(word);
              }
            }}
            placeholder="タグを検索または入力"
            className="min-w-0 flex-1 border-0 bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400"
          />
        </div>
        {tagInput.trim() && (
          <ul className="absolute left-5 right-5 top-full z-10 mt-1 max-h-48 overflow-auto rounded-xl border border-gray-200 bg-white py-1 shadow-lg">
            {recommendedTagList
              .filter((t) => !tags.includes(t) && t.toLowerCase().includes(tagInput.trim().toLowerCase()))
              .slice(0, 10)
              .map((tag) => (
                <li key={tag}>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm text-gray-900 hover:bg-gray-50"
                    onClick={() => addTag(tag)}
                  >
                    #{tag}
                  </button>
                </li>
              ))}
            {tagInput.trim() &&
              !recommendedTagList.includes(tagInput.trim()) &&
              !tags.includes(tagInput.trim()) && (
                <li className="border-t border-gray-100">
                  <button
                    type="button"
                    className="flex w-full items-center px-4 py-2.5 text-left text-sm text-gray-900 hover:bg-gray-50"
                    onClick={() => addTag(tagInput.trim())}
                  >
                    「{tagInput.trim()}」を新規タグで追加
                  </button>
                </li>
              )}
          </ul>
        )}
      </div>
    </section>
  );
}
