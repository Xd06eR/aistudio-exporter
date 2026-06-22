import { marked } from "marked";
// isomorphic-dompurify provides a jsdom-backed window on the server so sanitize
// actually runs during SSR — plain dompurify silently passes input through when
// no window exists, which would ship unsanitized HTML in exported files.
import DOMPurify from "isomorphic-dompurify";
import type { ConversationIR, FormatOptions } from "../types";
import { toMarkdown } from "./markdown";

export function toHtml(ir: ConversationIR, options: FormatOptions): string {
  const md = toMarkdown(ir, options);
  // `async: false` returns a string synchronously; guard so a future marked or
  // plugin that returns a Promise fails loudly instead of emitting "[object Promise]".
  const rendered = marked.parse(md, { async: false, gfm: true });
  if (typeof rendered !== "string") {
    throw new Error("marked.parse returned a non-string; expected synchronous output.");
  }
  // marked does not sanitize. Strip scripts/event handlers/javascript: URLs from
  // the file-derived HTML so the downloaded document can't execute injected code.
  const body = DOMPurify.sanitize(rendered);
  return wrapHtml(ir.title, body);
}

function wrapHtml(title: string, body: string): string {
  const safeTitle = title
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<!-- The body is sanitized with DOMPurify before embedding; this CSP is a
     defense-in-depth backstop that blocks inline scripts and unsafe URL schemes. -->
<meta http-equiv="Content-Security-Policy" content="script-src 'none'; object-src 'none'; base-uri 'none'">
<title>${safeTitle}</title>
<style>
  :root { color-scheme: light; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    max-width: 860px;
    margin: 2rem auto;
    padding: 0 1.5rem;
    color: #0f172a;
    background: #f8fafc;
    line-height: 1.7;
  }
  h1 { font-size: 2rem; }
  h2, h3, h4 { color: #1e293b; }
  hr { border: none; border-top: 1px solid #e2e8f0; margin: 2rem 0; }
  blockquote {
    border-left: 3px solid #6366f1;
    margin: 1rem 0;
    padding: 0.5rem 1rem;
    background: #eef2ff;
    color: #334155;
  }
  code {
    background: #e2e8f0;
    padding: 0.15rem 0.35rem;
    border-radius: 0.25rem;
    font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
    font-size: 0.9em;
  }
  pre {
    background: #0f172a;
    color: #e2e8f0;
    padding: 1rem;
    border-radius: 0.5rem;
    overflow-x: auto;
  }
  pre code { background: transparent; padding: 0; color: inherit; }
  table { border-collapse: collapse; width: 100%; margin: 1rem 0; }
  th, td { border: 1px solid #e2e8f0; padding: 0.5rem 0.75rem; text-align: left; }
  th { background: #f1f5f9; }
  a { color: #4f46e5; }
  strong { color: #1e293b; }
</style>
</head>
<body>
${body}
</body>
</html>`;
}