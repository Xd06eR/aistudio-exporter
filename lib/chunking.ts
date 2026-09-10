import type { ConversationIR, FormatOptions, OutputFormat } from "./types";
import { formatters } from "./formatters";
import { measureOutput } from "./tokens";

export const DEFAULT_CHUNK_BUDGET = 20000;

export interface PackedChunk<T> {
  items: T[];
  isOversized: boolean;
}

export interface TurnWeights {
  titleOnlyLength: number;
  preambleWeight: number;
  turnWeights: number[];
}

export interface ChunkOptions {
  budget: number;
  includePartHeader: boolean;
}

export interface ConversationChunk {
  content: string;
  charCount: number;
  tokenEstimate: number;
  turnCount: number;
  isOversized: boolean;
}

// Greedy bin packing at turn boundaries: a turn is never split mid-way. A turn
// heavier than the whole budget becomes its own flagged chunk rather than
// being dropped or divided. `initialWeight` seeds chunk 1 with the preamble
// (system instructions, prompt, examples) so part 1 carries the framing cost.
export function planChunks<T>(
  items: readonly T[],
  budget: number,
  weightOf: (item: T, index: number) => number,
  initialWeight = 0,
): PackedChunk<T>[] {
  if (!Number.isFinite(budget) || budget < 1) {
    throw new RangeError("Chunk budget must be a finite number >= 1.");
  }
  const chunks: PackedChunk<T>[] = [];
  let current: PackedChunk<T> = {
    items: [],
    isOversized: initialWeight > budget,
  };
  let used = initialWeight;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const itemWeight = weightOf(item, i);
    if (itemWeight > budget) {
      // Close whatever is open (chunk 1 may hold only the preamble), then
      // isolate the oversized item so nothing else shares its chunk.
      if (current.items.length > 0 || used > 0) chunks.push(current);
      chunks.push({ items: [item], isOversized: true });
      current = { items: [], isOversized: false };
      used = 0;
      continue;
    }
    if (used + itemWeight <= budget) {
      current.items.push(item);
      used += itemWeight;
    } else {
      chunks.push(current);
      current = { items: [item], isOversized: false };
      used = itemWeight;
    }
  }

  if (current.items.length > 0 || (chunks.length === 0 && initialWeight > 0)) {
    chunks.push(current);
  }
  return chunks;
}

// Weights come from formatting each turn standalone (minus the title line).
// Standalone rendering always emits a role header while in-context rendering
// dedups consecutive same-role headers — so the estimate runs slightly high,
// the safe direction: chunks land at or under budget. The sizes shown to the
// user are exact, measured on the final rendered chunk.
export function computeTurnWeights(
  ir: ConversationIR,
  formatId: OutputFormat,
  options: FormatOptions,
): TurnWeights {
  const format = formatters[formatId].format;
  const bare: FormatOptions = {
    ...options,
    part: undefined,
    showSystemInstructions: false,
  };
  const titleOnlyIr: ConversationIR = {
    ...ir,
    turns: [],
    systemInstructions: null,
    promptParts: null,
    examples: null,
  };
  const titleOnlyLength = format(titleOnlyIr, bare).length;

  const preambleLength = format(
    { ...ir, turns: [] },
    { ...options, part: undefined },
  ).length;
  const preambleWeight = Math.max(0, preambleLength - titleOnlyLength);

  const perTurnIr: ConversationIR = {
    ...ir,
    systemInstructions: null,
    promptParts: null,
    examples: null,
  };
  const turnWeights = ir.turns.map((turn) => {
    const standalone = format({ ...perTurnIr, turns: [turn] }, bare).length;
    return Math.max(0, standalone - titleOnlyLength);
  });

  return { titleOnlyLength, preambleWeight, turnWeights };
}

export function buildChunks(
  ir: ConversationIR,
  formatId: OutputFormat,
  options: FormatOptions,
  chunkOptions: ChunkOptions,
  weights: TurnWeights,
): ConversationChunk[] {
  if (ir.turns.length === 0) return [];
  const packed = planChunks(
    ir.turns,
    chunkOptions.budget,
    (_, i) => weights.turnWeights[i],
    weights.preambleWeight,
  );
  const total = packed.length;
  const format = formatters[formatId].format;

  return packed.map((chunk, idx) => {
    // The preamble frames the conversation; it belongs to part 1 alone so
    // later parts carry no duplicated context.
    const isFirst = idx === 0;
    const chunkIr: ConversationIR = isFirst
      ? { ...ir, turns: chunk.items }
      : {
          ...ir,
          turns: chunk.items,
          systemInstructions: null,
          promptParts: null,
          examples: null,
        };
    const part = chunkOptions.includePartHeader
      ? { index: idx + 1, total }
      : undefined;
    const content = format(chunkIr, { ...options, part });
    const measure = measureOutput(content);
    return {
      content,
      charCount: measure.chars,
      tokenEstimate: measure.tokens,
      turnCount: chunk.items.length,
      isOversized: chunk.isOversized,
    };
  });
}

// The budget lives as a string in the UI; parse leniently — empty or invalid
// input falls back to the default rather than blocking the export.
export function parseBudgetInput(raw: string): number {
  const trimmed = raw.trim();
  if (trimmed === "") return DEFAULT_CHUNK_BUDGET;
  const value = Number(trimmed);
  if (!Number.isFinite(value)) return DEFAULT_CHUNK_BUDGET;
  return Math.max(1, Math.floor(value));
}
