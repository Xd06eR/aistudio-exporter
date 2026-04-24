export type Role = "user" | "model";

export type ModelPersona =
  | "gemini"
  | "chatgpt"
  | "claude"
  | "grok"
  | "llama"
  | "mistral"
  | "deepseek";

export type OutputFormat = "markdown" | "xml" | "html";

export interface ContentPart {
  kind: "text" | "thinking" | "media" | "code" | "code-result";
  text?: string;
  codeLanguage?: string;
  codeOutcome?: string; // e.g. "OUTCOME_OK", "OUTCOME_FAILED"
}

export interface Turn {
  role: Role;
  parts: ContentPart[];
  // Gemini finish reasons: "STOP" is normal; others (MAX_TOKENS, SAFETY, …) are flagged in output.
  finishReason?: string;
}

export interface Example {
  input: ContentPart[];
  output: ContentPart[];
}

// Display-only: never emitted into the export. Reflects the toggle state
// at export time, not what the conversation used — e.g. codeExecution can
// be false in a file that contains code-execution chunks.
export interface RunSettings {
  model: string | null;
  temperature: number | null;
  topP: number | null;
  topK: number | null;
  maxOutputTokens: number | null;
  thinkingLevel: string | null;
  googleSearch: boolean;
  codeExecution: boolean;
  browse: boolean;
  maps: boolean;
  imageSearch: boolean;
}

export interface ConversationIR {
  title: string;
  systemInstructions: string | null;
  turns: Turn[];
  promptParts: ContentPart[] | null;
  examples: Example[] | null;
  runSettings: RunSettings | null;
  rawFallback: unknown | null;
}

export interface FormatOptions {
  includeThinking: boolean;
  modelPersona: ModelPersona;
  showSystemInstructions: boolean;
}
