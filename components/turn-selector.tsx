"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { Turn } from "@/lib/types";
import {
  addRangeToSelection,
  addRoleToSelection,
  createFullSelection,
  getTurnPreviewText,
  invertSelection,
} from "@/lib/turn-selection";

interface TurnSelectorProps {
  turns: readonly Turn[];
  selection: ReadonlySet<number>;
  onSelectionChange: (next: Set<number>) => void;
}

const ROLE_BADGE_STYLES: Record<string, string> = {
  USER: "bg-indigo-50 text-indigo-700 border-indigo-100",
  MODEL: "bg-emerald-50 text-emerald-700 border-emerald-100",
};

export function TurnSelector({
  turns,
  selection,
  onSelectionChange,
}: TurnSelectorProps) {
  const [expanded, setExpanded] = useState(true);
  const [rangeFrom, setRangeFrom] = useState("1");
  const [rangeTo, setRangeTo] = useState(String(turns.length));

  let selectedCount = 0;
  turns.forEach((_, i) => {
    if (selection.has(i)) selectedCount++;
  });

  const addRange = () => {
    const from = Number(rangeFrom);
    const to = Number(rangeTo);
    if (!Number.isFinite(from) || !Number.isFinite(to)) return;
    onSelectionChange(
      addRangeToSelection(selection, Math.floor(from), Math.floor(to), turns.length),
    );
  };

  const toggleTurn = (index: number) => {
    const next = new Set(selection);
    if (next.has(index)) next.delete(index);
    else next.add(index);
    onSelectionChange(next);
  };

  return (
    <div className="w-full max-w-4xl mx-auto mt-4 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <button
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        aria-controls="turn-selector-detail"
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500"
      >
        <div className="flex items-center gap-3">
          {expanded ? (
            <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
          ) : (
            <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
          )}
          <span className="text-sm font-medium text-slate-700">Turns</span>
          <span className="text-sm text-slate-500">·</span>
          <span
            className={`text-sm font-mono ${
              selectedCount === 0 ? "text-red-600" : "text-indigo-600"
            }`}
          >
            {selectedCount} of {turns.length} selected
          </span>
        </div>
      </button>

      {expanded && (
        <div
          id="turn-selector-detail"
          className="px-6 pb-5 pt-1 border-t border-slate-100 bg-slate-50/50"
        >
          <div className="flex flex-wrap items-center gap-2 mt-4">
            <QuickAction
              label="All"
              onClick={() => onSelectionChange(createFullSelection(turns.length))}
            />
            <QuickAction
              label="None"
              onClick={() => onSelectionChange(new Set())}
            />
            <QuickAction
              label="Invert"
              onClick={() =>
                onSelectionChange(invertSelection(selection, turns.length))
              }
            />
            <span className="w-px h-5 bg-slate-200 mx-1" aria-hidden="true" />
            <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
              From
              <input
                type="number"
                min={1}
                max={turns.length}
                value={rangeFrom}
                onChange={(e) => setRangeFrom(e.target.value)}
                aria-label="Range start turn"
                className="w-20 px-2 py-1 text-sm border border-slate-300 rounded-lg bg-white focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
              />
            </label>
            <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
              To
              <input
                type="number"
                min={1}
                max={turns.length}
                value={rangeTo}
                onChange={(e) => setRangeTo(e.target.value)}
                aria-label="Range end turn"
                className="w-20 px-2 py-1 text-sm border border-slate-300 rounded-lg bg-white focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
              />
            </label>
            <QuickAction label="Add Range" onClick={addRange} />
            <span className="w-px h-5 bg-slate-200 mx-1" aria-hidden="true" />
            <QuickAction
              label="+ User Turns"
              onClick={() =>
                onSelectionChange(addRoleToSelection(selection, turns, "user"))
              }
            />
            <QuickAction
              label="+ Model Turns"
              onClick={() =>
                onSelectionChange(addRoleToSelection(selection, turns, "model"))
              }
            />
          </div>

          <ul className="mt-4 max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-white divide-y divide-slate-100">
            {turns.map((turn, i) => (
              <li key={i}>
                <label className="flex items-center gap-3 px-3 py-2 hover:bg-slate-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selection.has(i)}
                    onChange={() => toggleTurn(i)}
                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                  />
                  <span className="text-xs font-mono text-slate-400 w-12 shrink-0">
                    #{i + 1}
                  </span>
                  <span
                    className={`px-2 py-0.5 text-xs font-medium rounded-full border shrink-0 ${
                      ROLE_BADGE_STYLES[turn.role.toUpperCase()] ??
                      "bg-slate-100 text-slate-600 border-slate-200"
                    }`}
                  >
                    {turn.role.toUpperCase()}
                  </span>
                  <span className="text-sm text-slate-600 truncate">
                    {getTurnPreviewText(turn)}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function QuickAction({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="px-2.5 py-1 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 hover:text-slate-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
    >
      {label}
    </button>
  );
}
