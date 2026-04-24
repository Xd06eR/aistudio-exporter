import type { ConversationIR, FormatOptions, OutputFormat } from "../types";
import { toMarkdown } from "./markdown";
import { toXml } from "./xml";
import { toHtml } from "./html";

export interface FormatDefinition {
  label: string;
  extension: string;
  mimeType: string;
  format: (ir: ConversationIR, options: FormatOptions) => string;
}

export const formatters: Record<OutputFormat, FormatDefinition> = {
  markdown: {
    label: "Markdown (.md)",
    extension: "md",
    mimeType: "text/markdown",
    format: toMarkdown,
  },
  xml: {
    label: "XML (.xml)",
    extension: "xml",
    mimeType: "application/xml",
    format: toXml,
  },
  html: {
    label: "HTML (.html)",
    extension: "html",
    mimeType: "text/html",
    format: toHtml,
  },
};

export const OUTPUT_FORMATS: OutputFormat[] = ["markdown", "xml", "html"];
