import type { ConversationIR, Role, Turn } from "./types";

// Indices refer to ir.turns positions (0-based). The formatters skip
// render-empty turns at format time, so filtering happens here —
// pre-formatter — where indices stay stable regardless of output options.
export type TurnSelection = ReadonlySet<number>;

export function createFullSelection(turnCount: number): Set<number> {
  return new Set(Array.from({ length: Math.max(0, turnCount) }, (_, i) => i));
}

export function invertSelection(
  selection: TurnSelection,
  turnCount: number,
): Set<number> {
  const inverted = new Set<number>();
  for (let i = 0; i < turnCount; i++) {
    if (!selection.has(i)) inverted.add(i);
  }
  return inverted;
}

// `from`/`to` are 1-based inclusive, matching the numbers users see in the
// turn list. Additive on top of the existing selection so several ranges
// (e.g. 1-50 and 60-70) compose.
export function addRangeToSelection(
  selection: TurnSelection,
  from: number,
  to: number,
  turnCount: number,
): Set<number> {
  const start = Math.min(from, to);
  const end = Math.max(from, to);
  const next = new Set(selection);
  for (let i = Math.max(1, start); i <= Math.min(turnCount, end); i++) {
    next.add(i - 1);
  }
  return next;
}

export function addRoleToSelection(
  selection: TurnSelection,
  turns: readonly Turn[],
  role: Role,
): Set<number> {
  const next = new Set(selection);
  turns.forEach((turn, i) => {
    if (turn.role === role) next.add(i);
  });
  return next;
}

// Preamble fields (systemInstructions, promptParts, examples) ride along;
// only the turn list is filtered.
export function filterTurns(
  ir: ConversationIR,
  selection: TurnSelection,
): ConversationIR {
  return { ...ir, turns: ir.turns.filter((_, i) => selection.has(i)) };
}

export function getTurnPreviewText(turn: Turn, maxLength = 60): string {
  for (const part of turn.parts) {
    const text = part.text?.trim();
    if (text) {
      // Truncate by code points so an astral-plane char isn't cut mid-pair.
      const chars = Array.from(text);
      return chars.length > maxLength
        ? chars.slice(0, maxLength).join("") + "…"
        : text;
    }
  }
  return "[no text]";
}
