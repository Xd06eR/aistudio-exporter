const FALLBACK_FILENAME = "conversation";

// Download names derive from conversation titles, which users control — strip
// everything a filesystem would reject before it reaches the browser's
// download attribute.
export function sanitizeFilename(name: string): string {
  const sanitized = name
    .replace(/[\x00-\x1f\\/:*?"<>|]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[.\s-]+|[.\s-]+$/g, "")
    .trim();
  return sanitized.length > 0 ? sanitized : FALLBACK_FILENAME;
}
