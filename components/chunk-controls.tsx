"use client";

interface ChunkControlsProps {
  budgetInput: string;
  onBudgetInputChange: (value: string) => void;
  includePartHeader: boolean;
  onIncludePartHeaderChange: (value: boolean) => void;
  chunkCount: number | null;
}

export function ChunkControls({
  budgetInput,
  onBudgetInputChange,
  includePartHeader,
  onIncludePartHeaderChange,
  chunkCount,
}: ChunkControlsProps) {
  return (
    <div className="flex flex-col gap-3 pt-4 mt-4 border-t border-slate-100">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <label className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-700 whitespace-nowrap">
            Chunk budget (characters):
          </span>
          <input
            type="number"
            min={1}
            value={budgetInput}
            onChange={(e) => onBudgetInputChange(e.target.value)}
            aria-label="Chunk budget in characters"
            className="w-28 px-3 py-2 text-sm border border-slate-300 rounded-lg bg-slate-50 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
          />
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={includePartHeader}
            onChange={(e) => onIncludePartHeaderChange(e.target.checked)}
            className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
          />
          <span className="text-sm font-medium text-slate-700">
            Part headers
          </span>
        </label>
        <span
          className="text-sm font-mono text-indigo-600"
          aria-live="polite"
        >
          {chunkCount === null
            ? "…"
            : `${chunkCount} chunk${chunkCount === 1 ? "" : "s"}`}
        </span>
      </div>
      <p className="text-xs text-slate-400">
        Each part stays at or under the budget so pasted output isn&apos;t
        truncated. A single turn larger than the budget becomes its own
        oversized part.
      </p>
    </div>
  );
}
