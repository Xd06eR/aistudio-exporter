import type { ContentPart, ConversationIR, FormatOptions } from "../types";
import { escapeXml, escapeXmlAttr, stripThink } from "./shared";

export function toXml(ir: ConversationIR, options: FormatOptions): string {
  const lines: string[] = [];
  lines.push(`<conversation title="${escapeXmlAttr(ir.title)}">`);

  if (options.showSystemInstructions && ir.systemInstructions) {
    const sys = options.includeThinking
      ? ir.systemInstructions
      : stripThink(ir.systemInstructions);
    lines.push(`  <system>${escapeXml(sys.trim())}</system>`);
  }

  for (const turn of ir.turns) {
    const body = renderParts(turn.parts, options, "    ");
    if (!body.trim()) continue;
    const roleAttr = turn.role === "user" ? "user" : "assistant";
    const reasonAttr = turn.finishReason
      ? ` finish-reason="${escapeXmlAttr(turn.finishReason)}"`
      : "";
    lines.push(`  <turn role="${roleAttr}"${reasonAttr}>`);
    lines.push(body);
    lines.push(`  </turn>`);
  }

  if (ir.promptParts && ir.promptParts.length > 0) {
    const body = renderParts(ir.promptParts, options, "    ");
    if (body.trim()) {
      lines.push(`  <prompt>`);
      lines.push(body);
      lines.push(`  </prompt>`);
    }
  }

  if (ir.examples && ir.examples.length > 0) {
    lines.push(`  <examples>`);
    ir.examples.forEach((ex, i) => {
      lines.push(`    <example index="${i + 1}">`);
      if (ex.input.length > 0) {
        lines.push(`      <input>`);
        lines.push(renderParts(ex.input, options, "        "));
        lines.push(`      </input>`);
      }
      if (ex.output.length > 0) {
        lines.push(`      <output>`);
        lines.push(renderParts(ex.output, options, "        "));
        lines.push(`      </output>`);
      }
      lines.push(`    </example>`);
    });
    lines.push(`  </examples>`);
  }

  if (ir.rawFallback) {
    lines.push(`  <raw-data>`);
    lines.push(escapeXml(JSON.stringify(ir.rawFallback, null, 2)));
    lines.push(`  </raw-data>`);
  }

  lines.push(`</conversation>`);
  return lines.join("\n");
}

function renderParts(
  parts: ContentPart[],
  options: FormatOptions,
  indent: string,
): string {
  const out: string[] = [];
  for (const part of parts) {
    if (part.kind === "thinking") {
      if (!options.includeThinking || !part.text) continue;
      out.push(`${indent}<thinking>${escapeXml(part.text.trim())}</thinking>`);
    } else if (part.kind === "media") {
      out.push(`${indent}<media>Image/Media Attachment</media>`);
    } else if (part.kind === "code") {
      const langAttr = part.codeLanguage
        ? ` language="${escapeXmlAttr(part.codeLanguage)}"`
        : "";
      out.push(`${indent}<code${langAttr}>${escapeXml(part.text || "")}</code>`);
    } else if (part.kind === "code-result") {
      const outcomeAttr = part.codeOutcome
        ? ` outcome="${escapeXmlAttr(part.codeOutcome)}"`
        : "";
      out.push(
        `${indent}<code-result${outcomeAttr}>${escapeXml(part.text || "")}</code-result>`,
      );
    } else if (part.text) {
      out.push(renderTextPart(part.text, options, indent));
    }
  }
  return out.filter(Boolean).join("\n");
}

// Splits inline <think> tags into separate <thinking> blocks.
function renderTextPart(
  text: string,
  options: FormatOptions,
  indent: string,
): string {
  if (!options.includeThinking) {
    const stripped = stripThink(text);
    if (!stripped) return "";
    return `${indent}<text>${escapeXml(stripped)}</text>`;
  }

  const segments: string[] = [];
  const re = /<think>([\s\S]*?)<\/think>/gi;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    const before = text.slice(lastIndex, match.index).trim();
    if (before) {
      segments.push(`${indent}<text>${escapeXml(before)}</text>`);
    }
    const thought = match[1].trim();
    if (thought) {
      segments.push(`${indent}<thinking>${escapeXml(thought)}</thinking>`);
    }
    lastIndex = match.index + match[0].length;
  }
  const tail = text.slice(lastIndex).trim();
  if (tail) {
    segments.push(`${indent}<text>${escapeXml(tail)}</text>`);
  }
  return segments.join("\n");
}
