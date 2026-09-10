import { describe, it, expect } from "vitest";
import { toMarkdown } from "./markdown";
import type { ConversationIR, FormatOptions } from "../types";

const options: FormatOptions = {
  includeThinking: true,
  modelPersona: "claude",
  showSystemInstructions: true,
};

function fixtureIr(): ConversationIR {
  return {
    title: "My Chat Title",
    systemInstructions: "Always answer briefly.",
    turns: [
      { role: "user", parts: [{ kind: "text", text: "Hello there" }] },
      {
        role: "model",
        parts: [
          { kind: "thinking", text: "greeting detected" },
          { kind: "text", text: "Hi! How can I help?" },
        ],
      },
      {
        role: "model",
        parts: [{ kind: "text", text: "Follow-up" }],
        finishReason: "MAX_TOKENS",
      },
      {
        role: "user",
        parts: [
          { kind: "attachment", attachmentType: "youtube", attachmentId: "abc123" },
        ],
      },
    ],
    promptParts: [{ kind: "text", text: "Write a poem" }],
    examples: null,
    runSettings: null,
  };
}

describe("toMarkdown", () => {
  it("renders uppercase persona role headers", () => {
    const out = toMarkdown(fixtureIr(), options);
    expect(out).toContain("**USER**");
    expect(out).toContain("**CLAUDE**");
  });

  it("emits one role header per run of consecutive same-role turns", () => {
    const out = toMarkdown(fixtureIr(), options);
    expect(out.indexOf("**CLAUDE**")).toBe(out.lastIndexOf("**CLAUDE**"));
  });

  it("renders structural labels in uppercase", () => {
    const out = toMarkdown(fixtureIr(), options);
    expect(out).toContain("**SYSTEM INSTRUCTIONS**");
    expect(out).toContain("**THINKING:**");
    expect(out).toContain("**PROMPT**");
  });

  it("keeps user content verbatim", () => {
    const out = toMarkdown(fixtureIr(), options);
    expect(out).toContain("My Chat Title");
    expect(out).toContain("Hello there");
    expect(out).toContain("Hi! How can I help?");
  });

  it("emits no emoji in structural output", () => {
    const out = toMarkdown(fixtureIr(), options);
    for (const emoji of ["👤", "🤖", "📎", "📄", "⚙️", "⚠️", "📝", "📚", "🔎"]) {
      expect(out).not.toContain(emoji);
    }
  });

  it("renders finish-reason notes as plain sentences", () => {
    const out = toMarkdown(fixtureIr(), options);
    expect(out).toContain("Response ended with `MAX_TOKENS` (not normal completion).");
  });

  it("appends the part suffix to the title when a part is set", () => {
    const out = toMarkdown(fixtureIr(), { ...options, part: { index: 2, total: 3 } });
    expect(out).toContain("**My Chat Title — Part 2/3**");
  });

  it("leaves the title unchanged when no part is set", () => {
    const out = toMarkdown(fixtureIr(), options);
    expect(out).toContain("**My Chat Title**");
    expect(out).not.toContain("Part 2/3");
  });
});
