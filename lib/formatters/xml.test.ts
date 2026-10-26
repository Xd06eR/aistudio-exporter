import { describe, it, expect } from "vitest";
import { toXml } from "./xml";
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

  it("hides Drive attachment elements when showDriveAttachments is off", () => {
    const ir: ConversationIR = {
      title: "T",
      systemInstructions: null,
      turns: [
        {
          role: "user",
          parts: [
            { kind: "text", text: "Check these" },
            { kind: "attachment", attachmentType: "drive-document", attachmentId: "doc1" },
            { kind: "attachment", attachmentType: "youtube", attachmentId: "abc123" },
          ],
        },
      ],
      promptParts: null,
      examples: null,
      runSettings: null,
    };
    const out = toXml(ir, { ...options, showDriveAttachments: false });
    expect(out).toContain("Check these");
    expect(out).toContain('<attachment type="youtube"');
    expect(out).not.toContain("drive-document");
    expect(out).not.toContain("doc1");
  });

  it("hides the YouTube attachment element when showYouTubeLinks is off", () => {
    const out = toXml(fixtureIr(), { ...options, showYouTubeLinks: false });
    expect(out).not.toContain("<attachment");
    expect(out).not.toContain("abc123");
  });

  it("keeps media elements when both attachment toggles are off", () => {
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
    const out = toXml(ir, {
      ...options,
      showDriveAttachments: false,
      showYouTubeLinks: false,
    });
    expect(out).toContain("<media>Image/Media Attachment</media>");
    expect(out).not.toContain("<attachment");
  });
});
