import type {
  ContentPart,
  ConversationIR,
  FormatOptions,
  Grounding,
} from "../types";
import { getRoleName, renderAttachmentLabel, stripThink } from "./shared";

// Plain text for targets that don't render markdown: no **, >, #, or link
// syntax — structure comes from all-caps labels and blank lines alone. Code
// keeps triple-backtick fences: they delimit code readably everywhere and most
// chatbots tolerate them even when they don't render them.
export function toPlainText(ir: ConversationIR, options: FormatOptions): string {
  const lines: string[] = [];
  lines.push(partTitle(ir.title, options));

  if (options.showSystemInstructions && ir.systemInstructions) {
    lines.push("");
    lines.push("SYSTEM INSTRUCTIONS");
    lines.push(renderText(ir.systemInstructions, options));
  }

  for (const turn of ir.turns) {
    const body = renderParts(turn.parts, options);
    if (!body.trim()) continue;
    // Every turn gets its own speaker line — plain text has no separator
    // to group consecutive same-role turns behind (markdown's ---).
    lines.push("");
    lines.push(`${getRoleName(turn.role, options.modelPersona)}:`);
    lines.push(body);
    if (turn.grounding) {
      lines.push(renderGrounding(turn.grounding));
    }
    if (turn.finishReason) {
      lines.push(`Response ended with \`${turn.finishReason}\` (not normal completion).`);
    }
  }

  if (ir.promptParts && ir.promptParts.length > 0) {
    const body = renderParts(ir.promptParts, options);
    if (body.trim()) {
      lines.push("");
      lines.push("PROMPT");
      lines.push(body);
    }
  }

  if (ir.examples && ir.examples.length > 0) {
    lines.push("");
    lines.push("EXAMPLES");
    ir.examples.forEach((ex, i) => {
      lines.push(`Example ${i + 1}`);
      if (ex.input.length > 0) {
        lines.push("INPUT:");
        lines.push(renderParts(ex.input, options));
      }
      if (ex.output.length > 0) {
        lines.push("OUTPUT:");
        lines.push(renderParts(ex.output, options));
      }
    });
  }

  return lines.join("\n").trim();
}

function partTitle(title: string, options: FormatOptions): string {
  return options.part ? `${title} — Part ${options.part.index}/${options.part.total}` : title;
}

function renderParts(parts: ContentPart[], options: FormatOptions): string {
  const out: string[] = [];
  for (const part of parts) {
    if (part.kind === "thinking") {
      if (!options.includeThinking || !part.text) continue;
      out.push(`THINKING:\n${part.text.trim()}`);
    } else if (part.kind === "media") {
      out.push("[Image/Media Attachment]");
    } else if (part.kind === "attachment") {
      out.push(`[${renderAttachmentLabel(part)}]`);
    } else if (part.kind === "json") {
      const body = (part.text || "").trim();
      if (body) out.push("```json\n" + body + "\n```");
    } else if (part.kind === "code") {
      const lang = part.codeLanguage || "text";
      const body = (part.text || "").replace(/\s+$/, "");
      out.push("```" + lang + "\n" + body + "\n```");
    } else if (part.kind === "code-result") {
      const failed = part.codeOutcome && part.codeOutcome !== "OUTCOME_OK";
      const label = failed ? "CODE EXECUTION ERROR:" : "CODE EXECUTION RESULT:";
      const body = (part.text || "").replace(/\s+$/, "");
      out.push(`${label}\n\`\`\`\n${body}\n\`\`\``);
    } else if (part.text) {
      out.push(renderText(part.text, options));
    }
  }
  return out.filter(Boolean).join("\n\n");
}

// Handles <think> tags embedded inside a text part — separate from first-class
// `kind: "thinking"` parts, rendered natively above.
function renderText(text: string, options: FormatOptions): string {
  if (!text) return "";
  if (!options.includeThinking) return stripThink(text);
  return text
    .replace(/<think>([\s\S]*?)<\/think>/gi, (_match, thought: string) => {
      return `THINKING:\n${thought.trim()}\n`;
    })
    .trim();
}

function renderGrounding(g: Grounding): string {
  const lines: string[] = ["GROUNDED WITH GOOGLE SEARCH"];
  if (g.webSearchQueries.length > 0) {
    lines.push("Searches performed:");
    for (const q of g.webSearchQueries) lines.push(`- ${q}`);
  }
  if (g.sources.length > 0) {
    lines.push("Sources:");
    for (const s of g.sources) {
      lines.push(`- ${s.title || s.uri} (${s.uri})`);
    }
  }
  return lines.join("\n");
}
