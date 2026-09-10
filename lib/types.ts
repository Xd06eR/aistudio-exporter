export type Role = "user" | "model";

export type ModelPersona =
  | "gemini"
  | "chatgpt"
  | "claude"
  | "grok"
  | "llama"
  | "mistral"
  | "deepseek";

export type OutputFormat = "markdown" | "xml" | "html" | "plain-text";

export type AttachmentType = "youtube" | "drive-image" | "drive-document";

export interface ContentPart {
  kind:
    | "text"
    | "thinking"
    | "media"
    | "code"
    | "code-result"
    | "attachment"
    | "json";
  text?: string;
  codeLanguage?: string;
  codeOutcome?: string; // e.g. "OUTCOME_OK", "OUTCOME_FAILED"
  attachmentType?: AttachmentType;
  attachmentId?: string;
}

// Search-grounded responses ship `webSearchQueries` (what was searched) and
// `groundingSources` (where citations came from). `corroborationSegments`
// also exists but maps char offsets to footnote numbers — not used here.
export interface GroundingSource {
  referenceNumber?: number;
  uri: string;
  title?: string;
}

export interface Grounding {
  webSearchQueries: string[];
  sources: GroundingSource[];
}

export interface Turn {
  role: Role;
  parts: ContentPart[];
  // Gemini finish reasons: "STOP" is normal; others (MAX_TOKENS, SAFETY, …) are flagged in output.
  finishReason?: string;
  grounding?: Grounding;
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
}

// Set only by the chunk pipeline; absent means single-output mode.
export interface PartInfo {
  index: number;
  total: number;
}

export interface FormatOptions {
  includeThinking: boolean;
  modelPersona: ModelPersona;
  showSystemInstructions: boolean;
  part?: PartInfo;
}
