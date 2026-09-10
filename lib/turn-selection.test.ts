import { describe, it, expect } from "vitest";
import {
  createFullSelection,
  invertSelection,
  addRangeToSelection,
  addRoleToSelection,
  filterTurns,
  getTurnPreviewText,
} from "./turn-selection";
import type { ConversationIR, Turn } from "./types";

function fixtureTurns(): Turn[] {
  return [
    { role: "user", parts: [{ kind: "text", text: "one" }] },
    { role: "model", parts: [{ kind: "text", text: "two" }] },
    { role: "user", parts: [{ kind: "text", text: "three" }] },
    {
      role: "model",
      parts: [
        { kind: "attachment", attachmentType: "youtube", attachmentId: "x" },
      ],
    },
  ];
}

function fixtureIr(): ConversationIR {
  return {
    title: "T",
    systemInstructions: "SYS",
    turns: fixtureTurns(),
    promptParts: null,
    examples: null,
    runSettings: null,
  };
}

describe("createFullSelection", () => {
  it("selects every index", () => {
    expect(createFullSelection(3)).toEqual(new Set([0, 1, 2]));
  });

  it("returns an empty set for zero turns", () => {
    expect(createFullSelection(0)).toEqual(new Set());
  });
});

describe("invertSelection", () => {
  it("round-trips with the full selection", () => {
    const full = createFullSelection(3);
    expect(invertSelection(invertSelection(full, 3), 3)).toEqual(full);
  });

  it("ignores stale indices beyond the turn count", () => {
    const stale = new Set([1, 99]);
    expect(invertSelection(stale, 3)).toEqual(new Set([0, 2]));
  });
});

describe("addRangeToSelection", () => {
  it("adds a 1-based inclusive range", () => {
    expect(addRangeToSelection(new Set(), 2, 3, 4)).toEqual(new Set([1, 2]));
  });

  it("normalizes a reversed range", () => {
    expect(addRangeToSelection(new Set(), 3, 2, 4)).toEqual(new Set([1, 2]));
  });

  it("clamps out-of-bounds ends", () => {
    expect(addRangeToSelection(new Set(), 0, 99, 4)).toEqual(
      new Set([0, 1, 2, 3]),
    );
  });

  it("unions with the existing selection so ranges compose", () => {
    const first = addRangeToSelection(new Set(), 1, 2, 5);
    expect(addRangeToSelection(first, 4, 5, 5)).toEqual(new Set([0, 1, 3, 4]));
  });
});

describe("addRoleToSelection", () => {
  it("adds only the indices of the given role", () => {
    expect(addRoleToSelection(new Set([1]), fixtureTurns(), "user")).toEqual(
      new Set([0, 1, 2]),
    );
  });
});

describe("filterTurns", () => {
  it("keeps only selected turns and preserves order", () => {
    const filtered = filterTurns(fixtureIr(), new Set([2, 0]));
    expect(filtered.turns.map((t) => (t.parts[0] as { text?: string }).text)).toEqual([
      "one",
      "three",
    ]);
  });

  it("keeps preamble fields untouched", () => {
    const filtered = filterTurns(fixtureIr(), new Set());
    expect(filtered.turns).toEqual([]);
    expect(filtered.systemInstructions).toBe("SYS");
    expect(filtered.title).toBe("T");
  });
});

describe("getTurnPreviewText", () => {
  it("returns the first non-empty part text", () => {
    const turn: Turn = {
      role: "user",
      parts: [{ kind: "text", text: "" }, { kind: "text", text: "hello" }],
    };
    expect(getTurnPreviewText(turn)).toBe("hello");
  });

  it("truncates long text at code-point boundaries", () => {
    const turn: Turn = {
      role: "user",
      parts: [{ kind: "text", text: "𠀀".repeat(70) }],
    };
    const preview = getTurnPreviewText(turn);
    expect(Array.from(preview)).toHaveLength(61); // 60 chars + ellipsis
    expect(preview.endsWith("…")).toBe(true);
  });

  it("falls back for turns with no text parts", () => {
    expect(getTurnPreviewText(fixtureTurns()[3])).toBe("[no text]");
  });
});
