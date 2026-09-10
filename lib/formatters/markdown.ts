import type {
  ContentPart,
  ConversationIR,
  FormatOptions,
  Grounding,
} from "../types";
import { getRoleName, renderAttachmentLabel, stripThink } from "./shared";

export function toMarkdown(ir: ConversationIR, options: FormatOptions): string {
  let md = `**${ir.title}${partSuffix(options)}**\n\n`;

  if (options.showSystemInstructions && ir.systemInstructions) {
    md += `---\n\n`;
    md += `**SYSTEM INSTRUCTIONS**\n\n`;
    md += `> ${processText(ir.systemInstructions, options).split("\n").join("\n> ")}\n\n`;
  }

  let lastRoleName = "";
  for (const turn of ir.turns) {
    const body = renderParts(turn.parts, options);
    if (!body.trim()) continue;

    const roleName = getRoleName(turn.role, options.modelPersona);
    if (roleName !== lastRoleName) {
      md += `---\n\n`;
      md += `**${roleName}**\n\n`;
      lastRoleName = roleName;
    }
    md += `${body}\n\n`;
    if (turn.grounding) {
      md += renderGrounding(turn.grounding) + "\n\n";
    }
    if (turn.finishReason) {
      md += `> *Response ended with \`${turn.finishReason}\` (not normal completion).*\n\n`;
    }
  }

  if (ir.promptParts && ir.promptParts.length > 0) {
    md += `---\n\n`;
    md += `**PROMPT**\n\n`;
    md += `${renderParts(ir.promptParts, options)}\n\n`;
  }

  if (ir.examples && ir.examples.length > 0) {
    md += `---\n\n`;
    md += `**EXAMPLES**\n\n`;
    ir.examples.forEach((ex, i) => {
      md += `**Example ${i + 1}**\n\n`;
      if (ex.input.length > 0) {
        md += `**INPUT:**\n${renderParts(ex.input, options)}\n\n`;
      }
      if (ex.output.length > 0) {
        md += `**OUTPUT:**\n${renderParts(ex.output, options)}\n\n`;
      }
    });
  }

  return md.trim();
}

function renderParts(parts: ContentPart[], options: FormatOptions): string {
  const out: string[] = [];
  for (const part of parts) {
    if (part.kind === "thinking") {
      if (!options.includeThinking || !part.text) continue;
      out.push(`> **THINKING:**\n> ${part.text.split("\n").join("\n> ")}`);
    } else if (part.kind === "media") {
      out.push(`*[Image/Media Attachment]*`);
    } else if (part.kind === "attachment") {
      out.push(`*[${renderAttachmentLabel(part)}]*`);
    } else if (part.kind === "json") {
      const body = (part.text || "").trim();
      if (body) out.push("```json\n" + body + "\n```");
    } else if (part.kind === "code") {
      const lang = part.codeLanguage || "text";
      const body = (part.text || "").replace(/\s+$/, "");
      out.push("```" + lang + "\n" + body + "\n```");
    } else if (part.kind === "code-result") {
      const failed = part.codeOutcome && part.codeOutcome !== "OUTCOME_OK";
      const label = failed ? "CODE EXECUTION ERROR" : "CODE EXECUTION RESULT";
      const body = (part.text || "").replace(/\s+$/, "");
      out.push(`**${label}:**\n\n\`\`\`\n${body}\n\`\`\``);
    } else if (part.text) {
      out.push(processText(part.text, options));
    }
  }
  return out.filter(Boolean).join("\n\n");
}

function processText(text: string, options: FormatOptions): string {
  if (!text) return "";
  if (!options.includeThinking) return stripThink(text);
  return text
    .replace(/<think>([\s\S]*?)<\/think>/gi, (_match, thought: string) => {
      // Prefix every line of the thought so multi-line content stays inside the blockquote.
      const quoted = thought.split("\n").join("\n> ");
      return `> **THINKING:**\n> ${quoted}\n\n`;
    })
    .trim();
}

function renderGrounding(g: Grounding): string {
  const lines: string[] = ["> **GROUNDED WITH GOOGLE SEARCH**"];
  if (g.webSearchQueries.length > 0) {
    lines.push(">");
    lines.push("> *Searches performed:*");
    for (const q of g.webSearchQueries) lines.push(`> - ${q}`);
  }
  if (g.sources.length > 0) {
    lines.push(">");
    lines.push("> *Sources:*");
    for (const s of g.sources) {
      const ref = s.referenceNumber ? `${s.referenceNumber}. ` : "- ";
      const label = s.title || s.uri;
      lines.push(`> ${ref}[${label}](${s.uri})`);
    }
  }
  return lines.join("\n");
}

function partSuffix(options: FormatOptions): string {
  return options.part ? ` — Part ${options.part.index}/${options.part.total}` : "";
}
