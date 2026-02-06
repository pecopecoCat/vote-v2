"use client";

export interface CheckboxProps {
  /** チェック状態 */
  checked: boolean;
  /** 変更時のコールバック */
  onChange: (checked: boolean) => void;
  /** チェックボックス右に表示するテキスト */
  label?: React.ReactNode;
  /** 無効化 */
  disabled?: boolean;
  /** アクセシビリティ用 id（label と紐づける場合） */
  id?: string;
  /** 追加の class（ラッパーに付与） */
  className?: string;
}

/**
 * 画像仕様のチェックボックス
 * - 未チェック: 角丸の四角・薄いグレー枠・白背景
 * - チェック時: 同じ四角・黄色背景・黒のチェックアイコン
 */
export default function Checkbox({
  checked,
  onChange,
  label,
  disabled = false,
  id,
  className = "",
}: CheckboxProps) {
  return (
    <label
      htmlFor={id}
      className={`inline-flex cursor-pointer items-center gap-2.5 ${disabled ? "cursor-not-allowed opacity-60" : ""} ${className}`}
    >
      <span className="relative h-6 w-6 shrink-0">
        <input
          type="checkbox"
          id={id}
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
          className="sr-only"
          aria-checked={checked}
        />
        <span
          role="presentation"
          className={`flex h-6 w-6 items-center justify-center rounded-lg border-2 transition-colors ${
            checked
              ? "border-[#FFE100] bg-[#FFE100]"
              : "border-gray-300 bg-white"
          } ${!disabled ? "cursor-pointer" : ""}`}
        >
          {checked ? (
            <img
              src="/icons/icon_check.svg"
              alt=""
              className="shrink-0"
              style={{ width: "8px", height: "5.6px" }}
              width={10}
              height={7}
            />
          ) : (
            <span className="h-[5.6px] w-[8px]" aria-hidden />
          )}
        </span>
      </span>
      {label != null && (
        <span className="select-none text-gray-900" style={{ fontSize: "15px" }}>{label}</span>
      )}
    </label>
  );
}
