import { describe, it, expect } from "vitest";
import { estimateTokens, measureOutput } from "./tokens";

describe("estimateTokens", () => {
  it("estimates pure Latin text at roughly four characters per token", () => {
    expect(estimateTokens("hello world")).toBe(3); // ceil(11 / 4)
  });

  it("counts CJK ideographs as one token each", () => {
    expect(estimateTokens("一二三四五六七八九十")).toBe(10);
  });

  it("counts kana as CJK", () => {
    expect(estimateTokens("あいう")).toBe(3);
  });

  it("counts hangul as CJK", () => {
    expect(estimateTokens("한국어")).toBe(3);
  });

  it("counts fullwidth punctuation as CJK", () => {
    expect(estimateTokens("！？")).toBe(2);
  });

  it("blends CJK and Latin segments in one string", () => {
    expect(estimateTokens("Hello 你好")).toBe(4); // 2 CJK + ceil(6 / 4)
  });

  it("counts astral-plane ideographs once despite surrogate pairs", () => {
    expect(estimateTokens("𠀀𠀀")).toBe(2);
  });

  it("returns zero for empty text", () => {
    expect(estimateTokens("")).toBe(0);
  });
});

describe("measureOutput", () => {
  it("reports UTF-16 length as chars so the budget and readout agree", () => {
    const measure = measureOutput("𠀀𠀀"); // two astral chars = 4 UTF-16 units
    expect(measure.chars).toBe(4);
    expect(measure.tokens).toBe(2);
  });

  it("measures plain ASCII exactly", () => {
    expect(measureOutput("hello world")).toEqual({ chars: 11, tokens: 3 });
  });

  it("returns zeros for empty output", () => {
    expect(measureOutput("")).toEqual({ chars: 0, tokens: 0 });
  });
});
