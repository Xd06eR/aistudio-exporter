import { describe, it, expect } from "vitest";
import {
  planChunks,
  parseBudgetInput,
  computeTurnWeights,
  buildChunks,
  DEFAULT_CHUNK_BUDGET,
} from "./chunking";
import type { ConversationIR, FormatOptions } from "./types";

const options: FormatOptions = {
  includeThinking: true,
  modelPersona: "gemini",
  showSystemInstructions: true,
};

function fixtureIr(): ConversationIR {
  return {
    title: "T",
    systemInstructions: "SYS",
    turns: [
      { role: "user", parts: [{ kind: "text", text: "a".repeat(50) }] },
      { role: "model", parts: [{ kind: "text", text: "b".repeat(50) }] },
      { role: "user", parts: [{ kind: "text", text: "c".repeat(50) }] },
    ],
    promptParts: [{ kind: "text", text: "PROMPTTEXT" }],
    examples: null,
    runSettings: null,
  };
}

describe("planChunks", () => {
  it("packs greedily while cumulative weight stays within budget", () => {
    const chunks = planChunks([5, 5, 5], 10, (n) => n);
    expect(chunks.map((c) => c.items)).toEqual([[5, 5], [5]]);
  });

  it("keeps an item that lands exactly at budget in the current chunk", () => {
    const chunks = planChunks([5, 5], 10, (n) => n);
    expect(chunks).toHaveLength(1);
    expect(chunks[0].isOversized).toBe(false);
  });

  it("isolates an oversized item with its neighbors intact", () => {
    const chunks = planChunks([5, 20, 5], 10, (n) => n);
    expect(chunks.map((c) => c.items)).toEqual([[5], [20], [5]]);
    expect(chunks.map((c) => c.isOversized)).toEqual([false, true, false]);
  });

  it("seeds chunk 1 with the preamble weight", () => {
    const chunks = planChunks([5, 5, 5], 10, (n) => n, 4);
    expect(chunks.map((c) => c.items)).toEqual([[5], [5, 5]]);
  });

  it("emits an empty oversized chunk 1 when the preamble alone exceeds budget", () => {
    const chunks = planChunks([5], 10, (n) => n, 12);
    expect(chunks[0].items).toEqual([]);
    expect(chunks[0].isOversized).toBe(true);
    expect(chunks[1].items).toEqual([5]);
  });

  it("emits a preamble-only chunk when no turn fits", () => {
    const chunks = planChunks([5, 5], 10, (n) => n, 9);
    expect(chunks[0].items).toEqual([]);
    expect(chunks[0].isOversized).toBe(false);
    expect(chunks[1].items).toEqual([5, 5]);
  });

  it("returns nothing for empty input", () => {
    expect(planChunks([], 10, (n) => n, 0)).toEqual([]);
  });

  it("throws on a non-positive or non-finite budget", () => {
    expect(() => planChunks([1], 0, (n) => n)).toThrow(RangeError);
    expect(() => planChunks([1], Number.NaN, (n) => n)).toThrow(RangeError);
  });
});

describe("parseBudgetInput", () => {
  it("parses a plain integer", () => {
    expect(parseBudgetInput("20000")).toBe(20000);
  });

  it("falls back to the default on empty or invalid input", () => {
    expect(parseBudgetInput("")).toBe(DEFAULT_CHUNK_BUDGET);
    expect(parseBudgetInput("abc")).toBe(DEFAULT_CHUNK_BUDGET);
  });

  it("floors decimals and clamps below 1", () => {
    expect(parseBudgetInput("12.7")).toBe(12);
    expect(parseBudgetInput("-5")).toBe(1);
    expect(parseBudgetInput("0")).toBe(1);
  });
});

describe("computeTurnWeights", () => {
  it("assigns a positive weight to each non-empty turn", () => {
    const weights = computeTurnWeights(fixtureIr(), "markdown", options);
    expect(weights.turnWeights).toHaveLength(3);
    for (const w of weights.turnWeights) expect(w).toBeGreaterThan(0);
  });

  it("counts the preamble when shown and excludes it when hidden", () => {
    const withPreamble = computeTurnWeights(fixtureIr(), "markdown", options);
    const withoutSys = computeTurnWeights(fixtureIr(), "markdown", {
      ...options,
      showSystemInstructions: false,
    });
    expect(withPreamble.preambleWeight).toBeGreaterThan(0);
    expect(withoutSys.preambleWeight).toBeLessThan(withPreamble.preambleWeight);
  });
});

describe("buildChunks", () => {
  it("splits turns across chunks with part headers and preamble in part 1 only", () => {
    const ir = fixtureIr();
    const weights = computeTurnWeights(ir, "markdown", options);
    // One turn per chunk: budget covers the preamble plus exactly one turn.
    const budget = weights.turnWeights[0] + weights.preambleWeight;
    const chunks = buildChunks(ir, "markdown", options, { budget, includePartHeader: true }, weights);
    expect(chunks).toHaveLength(3);
    expect(chunks[0].content).toContain("Part 1/3");
    expect(chunks[1].content).toContain("Part 2/3");
    expect(chunks[2].content).toContain("Part 3/3");
    expect(chunks[0].content).toContain("SYS");
    expect(chunks[0].content).toContain("PROMPTTEXT");
    expect(chunks[1].content).not.toContain("SYS");
    expect(chunks[1].content).not.toContain("PROMPTTEXT");
    expect(chunks[0].turnCount).toBe(1);
    expect(chunks[0].isOversized).toBe(false);
  });

  it("omits part headers when the toggle is off", () => {
    const ir = fixtureIr();
    const weights = computeTurnWeights(ir, "markdown", options);
    const budget = weights.turnWeights[0];
    const chunks = buildChunks(
      ir,
      "markdown",
      options,
      { budget, includePartHeader: false },
      weights,
    );
    for (const chunk of chunks) expect(chunk.content).not.toContain("Part 1/");
  });

  it("flags a single oversized turn as its own chunk after the preamble part", () => {
    const ir: ConversationIR = {
      ...fixtureIr(),
      turns: [
        { role: "user", parts: [{ kind: "text", text: "x".repeat(500) }] },
      ],
    };
    const weights = computeTurnWeights(ir, "markdown", options);
    const chunks = buildChunks(
      ir,
      "markdown",
      options,
      { budget: 100, includePartHeader: true },
      weights,
    );
    // Part 1 carries the preamble alone (no turn fits alongside the oversized
    // one); part 2 isolates the oversized turn.
    expect(chunks).toHaveLength(2);
    expect(chunks[0].turnCount).toBe(0);
    expect(chunks[0].content).toContain("SYS");
    expect(chunks[0].isOversized).toBe(false);
    expect(chunks[1].isOversized).toBe(true);
    expect(chunks[1].turnCount).toBe(1);
  });

  it("keeps every non-oversized chunk within budget plus title overhead", () => {
    const ir = fixtureIr();
    const weights = computeTurnWeights(ir, "markdown", options);
    const chunks = buildChunks(
      ir,
      "markdown",
      options,
      { budget: 300, includePartHeader: true },
      weights,
    );
    for (const chunk of chunks) {
      if (!chunk.isOversized) {
        // Standalone weights overestimate in-context contribution, so the
        // rendered chunk may only exceed budget by the title line and the
        // "\n\n" separators standalone formatting can't account for.
        expect(chunk.charCount).toBeLessThanOrEqual(
          300 + weights.titleOnlyLength + 4 * chunk.turnCount,
        );
      }
    }
  });

  it("returns an empty array for a conversation with no turns", () => {
    const ir: ConversationIR = { ...fixtureIr(), turns: [] };
    const weights = computeTurnWeights(ir, "markdown", options);
    expect(
      buildChunks(ir, "markdown", options, { budget: 100, includePartHeader: true }, weights),
    ).toEqual([]);
  });
});
