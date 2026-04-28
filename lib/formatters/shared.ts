import type { ContentPart, ModelPersona, Role } from "../types";

export function getRoleName(role: Role, persona: ModelPersona): string {
  const isUser = role === "user";
  switch (persona) {
    case "chatgpt":
      return isUser ? "👤 User" : "🤖 ChatGPT";
    case "claude":
      return isUser ? "👤 User" : "🤖 Claude";
    case "grok":
      return isUser ? "👤 User" : "🤖 Grok";
    case "llama":
      return isUser ? "👤 User" : "🤖 Llama";
    case "mistral":
      return isUser ? "👤 User" : "🤖 Mistral";
    case "deepseek":
      return isUser ? "👤 User" : "🤖 DeepSeek";
    case "gemini":
    default:
      return isUser ? "👤 User" : "🤖 Model";
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
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;");
}

// AI Studio exports only the reference (ID) for user attachments — never the
// content itself. Render a labelled placeholder so reader/LLM context stays
// coherent across follow-up turns.
export function renderAttachmentLabel(part: ContentPart): string {
  const id = part.attachmentId || "unknown";
  switch (part.attachmentType) {
    case "youtube":
      return `📎 YouTube video attached: https://www.youtube.com/watch?v=${id}`;
    case "drive-image":
      return `📎 Image attached (Google Drive ID: ${id})`;
    case "drive-document":
      return `📎 Document attached (Google Drive ID: ${id})`;
    default:
      return `📎 Attachment (ID: ${id})`;
  }
}
