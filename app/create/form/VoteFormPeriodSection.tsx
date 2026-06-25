"use client";

import Checkbox from "../../components/Checkbox";
import { DAYS, MONTHS, YEARS } from "./createVoteFormConstants";

type VoteFormPeriodSectionProps = {
  useVotePeriod: boolean;
  onUseVotePeriodChange: (value: boolean) => void;
  startYear: number;
  startMonth: number;
  startDay: number;
  endYear: number;
  endMonth: number;
  endDay: number;
  onStartYearChange: (value: number) => void;
  onStartMonthChange: (value: number) => void;
  onStartDayChange: (value: number) => void;
  onEndYearChange: (value: number) => void;
  onEndMonthChange: (value: number) => void;
  onEndDayChange: (value: number) => void;
};

function DateSelectors({
  year,
  month,
  day,
  onYearChange,
  onMonthChange,
  onDayChange,
}: {
  year: number;
  month: number;
  day: number;
  onYearChange: (value: number) => void;
  onMonthChange: (value: number) => void;
  onDayChange: (value: number) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      <select
        value={year}
        onChange={(e) => onYearChange(Number(e.target.value))}
        className="rounded-lg border border-gray-200 bg-white px-2 py-2 text-sm text-gray-900"
      >
        {YEARS.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>
      <span className="text-sm text-gray-500">年</span>
      <select
        value={month}
        onChange={(e) => onMonthChange(Number(e.target.value))}
        className="rounded-lg border border-gray-200 bg-white px-2 py-2 text-sm text-gray-900"
      >
        {MONTHS.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>
      <span className="text-sm text-gray-500">月</span>
      <select
        value={day}
        onChange={(e) => onDayChange(Number(e.target.value))}
        className="rounded-lg border border-gray-200 bg-white px-2 py-2 text-sm text-gray-900"
      >
        {DAYS.map((d) => (
          <option key={d} value={d}>
            {d}
          </option>
        ))}
      </select>
      <span className="text-sm text-gray-500">日</span>
    </div>
  );
}

export default function VoteFormPeriodSection(props: VoteFormPeriodSectionProps) {
  return (
    <section>
      <h2 className="mb-2 text-sm font-bold text-gray-900">投票期間</h2>
      <div className="mb-3">
        <Checkbox
          checked={props.useVotePeriod}
          onChange={props.onUseVotePeriodChange}
          label="投票期間を設定する"
        />
      </div>
      {props.useVotePeriod && (
        <div className="space-y-3 rounded-xl bg-white p-4">
          <div>
            <p className="mb-1 text-xs text-gray-600">開始期間</p>
            <DateSelectors
              year={props.startYear}
              month={props.startMonth}
              day={props.startDay}
              onYearChange={props.onStartYearChange}
              onMonthChange={props.onStartMonthChange}
              onDayChange={props.onStartDayChange}
            />
          </div>
          <div>
            <p className="mb-1 text-xs text-gray-600">終了期間</p>
            <DateSelectors
              year={props.endYear}
              month={props.endMonth}
              day={props.endDay}
              onYearChange={props.onEndYearChange}
              onMonthChange={props.onEndMonthChange}
              onDayChange={props.onEndDayChange}
            />
          </div>
        </div>
      )}
    </section>
  );
}
