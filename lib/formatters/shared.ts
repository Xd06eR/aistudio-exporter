import type { ContentPart, ModelPersona, Role } from "../types";

// All-caps speaker tags: transcript-style caps are a strong separation signal
// LLMs parse reliably, and they stay visually distinct in formats without bold.
export function getRoleName(role: Role, persona: ModelPersona): string {
  const isUser = role === "user";
  switch (persona) {
    case "chatgpt":
      return isUser ? "USER" : "CHATGPT";
    case "claude":
      return isUser ? "USER" : "CLAUDE";
    case "grok":
      return isUser ? "USER" : "GROK";
    case "llama":
      return isUser ? "USER" : "LLAMA";
    case "mistral":
      return isUser ? "USER" : "MISTRAL";
    case "deepseek":
      return isUser ? "USER" : "DEEPSEEK";
    case "gemini":
    default:
      return isUser ? "USER" : "MODEL";
  }
}

// Handles <think> tags embedded inside a text part — separate from
// first-class `kind: "thinking"` parts, which formatters render natively.
export function stripThink(text: string): string {
  return text.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
}

export function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function escapeXmlAttr(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// AI Studio exports only the reference (ID) for user attachments — never the
// content itself. Render a labelled placeholder so reader/LLM context stays
// coherent across follow-up turns.
export function renderAttachmentLabel(part: ContentPart): string {
  const id = part.attachmentId || "unknown";
  switch (part.attachmentType) {
    case "youtube":
      return `YouTube video attached: https://www.youtube.com/watch?v=${id}`;
    case "drive-image":
      return `Image attached (Google Drive ID: ${id})`;
    case "drive-document":
      return `Document attached (Google Drive ID: ${id})`;
    default:
      return `Attachment (ID: ${id})`;
  }
}
