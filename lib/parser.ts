/* eslint-disable @typescript-eslint/no-explicit-any */
// AI Studio's export schema is unofficial and drifts; we use `any` internally.
import type {
  ContentPart,
  ConversationIR,
  Example,
  RunSettings,
  Turn,
} from "./types";

export function parseAIStudioExport(
  jsonInput: unknown,
  filename: string,
): ConversationIR {
  const jsonContent = jsonInput as any;
  const title = filename.replace(".json", "");

  let systemInstructions: string | null = null;
  if (jsonContent.systemInstruction) {
    if (Array.isArray(jsonContent.systemInstruction.parts)) {
      const joined = jsonContent.systemInstruction.parts
        .map((p: any) => p.text || "")
        .filter(Boolean)
        .join("\n\n");
      systemInstructions = joined || null;
    } else if (jsonContent.systemInstruction.text) {
      systemInstructions = jsonContent.systemInstruction.text;
    }
  }

  const history = jsonContent.history || jsonContent.chunkedPrompt?.chunks;
  const turns: Turn[] = [];
  if (Array.isArray(history)) {
    for (const turn of history) {
      const parts = extractParts(turn);
      if (parts.length === 0) continue;
      const t: Turn = {
        role: turn.role === "user" ? "user" : "model",
        parts,
      };
      if (turn.finishReason && turn.finishReason !== "STOP") {
        t.finishReason = turn.finishReason;
      }
      turns.push(t);
    }
  }

  let promptParts: ContentPart[] | null = null;
  if (Array.isArray(jsonContent.prompt?.parts)) {
    const parts = extractPartsArray(jsonContent.prompt.parts);
    promptParts = parts.length > 0 ? parts : null;
  }

  let examples: Example[] | null = null;
  if (Array.isArray(jsonContent.examples)) {
    examples = jsonContent.examples.map((ex: any) => ({
      input: extractPartsArray(ex.input?.parts || []),
      output: extractPartsArray(ex.output?.parts || []),
    }));
  }

  const runSettings = extractRunSettings(jsonContent.runSettings);

  const hasKnownFormat =
    turns.length > 0 || promptParts !== null || (examples && examples.length > 0);
  const rawFallback = hasKnownFormat ? null : jsonContent;

  return {
    title,
    systemInstructions,
    turns,
    promptParts,
    examples,
    runSettings,
    rawFallback,
  };
}

function extractParts(turn: any): ContentPart[] {
  if (Array.isArray(turn.parts)) {
    return extractPartsArray(turn.parts);
  }
  if (turn.text) {
    return [{ kind: "text", text: turn.text }];
  }
  // Chunks whose only content is an unresolvable attachment (driveDocument,
  // driveImage, youtubeVideo) are dropped — follow-ups referencing them lose context.
  return [];
}

function extractPartsArray(parts: any[]): ContentPart[] {
  const result: ContentPart[] = [];
  for (const part of parts) {
    let next: ContentPart | null = null;

    if (part.thought || part.isThought) {
      if (part.text) next = { kind: "thinking", text: part.text };
    } else if (part.executableCode) {
      const code = part.executableCode;
      if (code.code) {
        next = {
          kind: "code",
          text: code.code,
          codeLanguage: (code.language || "").toLowerCase() || "text",
        };
      }
    } else if (part.codeExecutionResult) {
      const res = part.codeExecutionResult;
      if (res.output) {
        next = {
          kind: "code-result",
          text: res.output,
          codeOutcome: res.outcome,
        };
      }
    } else if (part.text) {
      next = { kind: "text", text: part.text };
    } else if (part.inlineData || part.fileData) {
      // API-native attachment shapes; AI Studio uses chunk-level drive*/youtubeVideo instead.
      next = { kind: "media" };
    }
    // Parts with only a thoughtSignature (internal Google metadata) fall through.

    if (!next) continue;

    // Model output is streamed as many small fragments (one per tick).
    // Joining with \n\n would shatter CJK prose mid-sentence, so merge
    // consecutive text/thinking parts. Code/media are real boundaries.
    const last = result[result.length - 1];
    if (
      last &&
      last.kind === next.kind &&
      (next.kind === "text" || next.kind === "thinking")
    ) {
      last.text = (last.text || "") + (next.text || "");
    } else {
      result.push(next);
    }
  }
  return result;
}

function extractRunSettings(rs: any): RunSettings | null {
  if (!rs || typeof rs !== "object") return null;
  return {
    model: typeof rs.model === "string" ? rs.model : null,
    temperature: typeof rs.temperature === "number" ? rs.temperature : null,
    topP: typeof rs.topP === "number" ? rs.topP : null,
    topK: typeof rs.topK === "number" ? rs.topK : null,
    maxOutputTokens:
      typeof rs.maxOutputTokens === "number" ? rs.maxOutputTokens : null,
    thinkingLevel:
      typeof rs.thinkingLevel === "string" ? rs.thinkingLevel : null,
    googleSearch: !!rs.googleSearch,
    codeExecution: !!rs.enableCodeExecution,
    browse: !!rs.enableBrowseAsATool,
    maps: !!rs.enableGoogleMaps,
    imageSearch: !!rs.enableImageSearch,
  };
}
