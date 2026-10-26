import { describe, it, expect } from "vitest";
import { toMarkdown } from "./markdown";
import type { ConversationIR, FormatOptions } from "../types";

const options: FormatOptions = {
  includeThinking: true,
  modelPersona: "claude",
  showSystemInstructions: true,
  showDriveAttachments: true,
  showYouTubeLinks: true,
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

function attachmentsIr(): ConversationIR {
  return {
    title: "T",
    systemInstructions: null,
    turns: [
      {
        role: "user",
        parts: [
          { kind: "text", text: "Check these" },
          { kind: "attachment", attachmentType: "drive-document", attachmentId: "doc1" },
          { kind: "attachment", attachmentType: "drive-image", attachmentId: "img1" },
          { kind: "attachment", attachmentType: "youtube", attachmentId: "abc123" },
        ],
      },
    ],
    promptParts: null,
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

  it("renders all attachment placeholders when both toggles are on", () => {
    const out = toMarkdown(attachmentsIr(), options);
    expect(out).toContain("Document attached (Google Drive ID: doc1)");
    expect(out).toContain("Image attached (Google Drive ID: img1)");
    expect(out).toContain("https://www.youtube.com/watch?v=abc123");
  });

  it("hides Drive placeholders but keeps text and YouTube when showDriveAttachments is off", () => {
    const out = toMarkdown(attachmentsIr(), {
      ...options,
      showDriveAttachments: false,
    });
    expect(out).toContain("Check these");
    expect(out).toContain("https://www.youtube.com/watch?v=abc123");
    expect(out).not.toContain("Document attached");
    expect(out).not.toContain("Image attached");
    expect(out).not.toContain("doc1");
  });

  it("hides the YouTube placeholder but keeps Drive labels when showYouTubeLinks is off", () => {
    const out = toMarkdown(attachmentsIr(), { ...options, showYouTubeLinks: false });
    expect(out).toContain("Document attached (Google Drive ID: doc1)");
    expect(out).not.toContain("youtube.com");
    expect(out).not.toContain("abc123");
  });

  it("keeps media placeholders when both attachment toggles are off", () => {
    const ir: ConversationIR = {
      title: "T",
      systemInstructions: null,
      turns: [
        {
          role: "model",
          parts: [
            { kind: "media" },
            { kind: "attachment", attachmentType: "drive-document", attachmentId: "doc1" },
          ],
        },
      ],
      promptParts: null,
      examples: null,
      runSettings: null,
    };
    const out = toMarkdown(ir, {
      ...options,
      showDriveAttachments: false,
      showYouTubeLinks: false,
    });
    expect(out).toContain("Image/Media Attachment");
    expect(out).not.toContain("Document attached");
  });
});
