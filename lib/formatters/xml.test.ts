import { describe, it, expect } from "vitest";
import { toXml } from "./xml";
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
          { kind: "attachment", attachmentType: "youtube", attachmentId: "abc123" },
        ],
      },
    ],
    promptParts: null,
    examples: null,
    runSettings: null,
  };
}

describe("toXml", () => {
  it("keeps user/assistant role attributes for LLM compatibility", () => {
    const out = toXml(fixtureIr(), options);
    expect(out).toContain('<turn role="user"');
    expect(out).toContain('<turn role="assistant"');
  });

  it("renders attachment labels as plain descriptive text", () => {
    const out = toXml(fixtureIr(), options);
    expect(out).toContain(
      "YouTube video attached: https://www.youtube.com/watch?v=abc123",
    );
    expect(out).not.toContain("📎");
  });

  it("emits no emoji in structural output", () => {
    const out = toXml(fixtureIr(), options);
    for (const emoji of ["👤", "🤖", "📎", "📄", "⚙️", "⚠️", "📝", "📚", "🔎"]) {
      expect(out).not.toContain(emoji);
    }
  });

  it("encodes part info as conversation attributes, not text", () => {
    const out = toXml(fixtureIr(), { ...options, part: { index: 2, total: 3 } });
    expect(out).toContain('<conversation title="My Chat Title" part="2" of="3">');
    expect(out).not.toContain("Part 2/3");
  });

  it("leaves the root element unchanged when no part is set", () => {
    const out = toXml(fixtureIr(), options);
    expect(out).toContain('<conversation title="My Chat Title">');
  });
});
