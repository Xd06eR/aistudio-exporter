import { describe, it, expect } from "vitest";
import { toPlainText } from "./plain-text";
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
          { kind: "code", text: "print('hi')", codeLanguage: "python" },
          {
            kind: "code-result",
            text: "hi",
            codeOutcome: "OUTCOME_OK",
          },
          { kind: "json", text: '{"ok": true}' },
          { kind: "media" },
          {
            kind: "attachment",
            attachmentType: "youtube",
            attachmentId: "abc123",
          },
        ],
        grounding: {
          webSearchQueries: ["latest news"],
          sources: [
            { uri: "https://example.com", title: "Example" },
            { uri: "https://untitled.com" },
          ],
        },
      },
      {
        role: "model",
        parts: [
          { kind: "text", text: "outer <think>hidden thought</think> tail" },
        ],
        finishReason: "MAX_TOKENS",
      },
      {
        role: "user",
        parts: [
          {
            kind: "code-result",
            text: "boom",
            codeOutcome: "OUTCOME_FAILED",
          },
          { kind: "code-result", text: "run without outcome" },
        ],
      },
    ],
    promptParts: [{ kind: "text", text: "Write a poem" }],
    examples: [
      {
        input: [{ kind: "text", text: "in" }],
        output: [{ kind: "text", text: "out" }],
      },
    ],
    runSettings: null,
  };
}

describe("toPlainText", () => {
  it("gives every turn an all-caps speaker line", () => {
    const out = toPlainText(fixtureIr(), options);
    expect(out).toContain("USER:");
    expect(out).toContain("CLAUDE:");
  });

  it("opens with the bare title", () => {
    const out = toPlainText(fixtureIr(), options);
    expect(out.startsWith("My Chat Title")).toBe(true);
  });

  it("uses no markdown syntax for structure", () => {
    const out = toPlainText(fixtureIr(), options);
    expect(out).not.toContain("**");
    expect(out).not.toContain("](");
  });

  it("keeps fenced code blocks with their language", () => {
    const out = toPlainText(fixtureIr(), options);
    expect(out).toContain("```python");
    expect(out).toContain("CODE EXECUTION RESULT:");
  });

  it("renders uppercase structural labels", () => {
    const out = toPlainText(fixtureIr(), options);
    expect(out).toContain("SYSTEM INSTRUCTIONS");
    expect(out).toContain("THINKING:");
    expect(out).toContain("GROUNDED WITH GOOGLE SEARCH");
  });

  it("renders grounding sources as plain text, not markdown links", () => {
    const out = toPlainText(fixtureIr(), options);
    expect(out).toContain("- latest news");
    expect(out).toContain("- Example (https://example.com)");
    expect(out).toContain("- https://untitled.com (https://untitled.com)");
  });

  it("renders structured output, media placeholders, and failed code runs", () => {
    const out = toPlainText(fixtureIr(), options);
    expect(out).toContain('```json\n{"ok": true}\n```');
    expect(out).toContain("[Image/Media Attachment]");
    expect(out).toContain("CODE EXECUTION ERROR:");
    expect(out).toContain(
      "[YouTube video attached: https://www.youtube.com/watch?v=abc123]",
    );
  });

  it("splits inline think tags into labelled blocks", () => {
    const out = toPlainText(fixtureIr(), options);
    expect(out).toContain("THINKING:\nhidden thought");
    expect(out).toContain("outer");
    expect(out).toContain("tail");
  });

  it("strips inline think tags entirely when thinking is off", () => {
    const out = toPlainText(fixtureIr(), { ...options, includeThinking: false });
    expect(out).not.toContain("hidden thought");
    expect(out).toContain("outer");
    expect(out).toContain("tail");
  });

  it("renders finish reasons as plain sentences", () => {
    const out = toPlainText(fixtureIr(), options);
    expect(out).toContain("Response ended with `MAX_TOKENS` (not normal completion).");
  });

  it("renders prompt and examples sections with labelled fields", () => {
    const out = toPlainText(fixtureIr(), options);
    expect(out).toContain("PROMPT");
    expect(out).toContain("Write a poem");
    expect(out).toContain("EXAMPLES");
    expect(out).toContain("Example 1");
    expect(out).toContain("INPUT:");
    expect(out).toContain("in");
    expect(out).toContain("OUTPUT:");
    expect(out).toContain("out");
  });

  it("omits system instructions when the toggle is off", () => {
    const out = toPlainText(fixtureIr(), { ...options, showSystemInstructions: false });
    expect(out).not.toContain("SYSTEM INSTRUCTIONS");
    expect(out).not.toContain("Always answer briefly.");
  });

  it("appends a bare part header when a part is set", () => {
    const out = toPlainText(fixtureIr(), { ...options, part: { index: 2, total: 3 } });
    expect(out.startsWith("My Chat Title — Part 2/3")).toBe(true);
  });

  it("keeps user content verbatim", () => {
    const out = toPlainText(fixtureIr(), options);
    expect(out).toContain("Hello there");
    expect(out).toContain("Hi! How can I help?");
  });

  it("renders a minimal conversation without optional sections", () => {
    const ir: ConversationIR = {
      title: "Bare",
      systemInstructions: null,
      turns: [
        { role: "user", parts: [{ kind: "text", text: "hi" }] },
        {
          role: "model",
          parts: [{ kind: "text", text: "done" }],
          grounding: { webSearchQueries: [], sources: [] },
        },
      ],
      promptParts: null,
      examples: null,
      runSettings: null,
    };
    const out = toPlainText(ir, options);
    expect(out).toBe("Bare\n\nUSER:\nhi\n\nCLAUDE:\ndone\nGROUNDED WITH GOOGLE SEARCH");
  });
});
