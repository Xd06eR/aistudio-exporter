"use client";

import { useEffect, useRef, useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Download, Copy, Check, ChevronLeft, ChevronRight } from "lucide-react";
import { formatters } from "@/lib/formatters";
import { sanitizeFilename } from "@/lib/filename";
import type { OutputFormat } from "@/lib/types";
import type { OutputMeasure } from "@/lib/tokens";

interface ChunkNav {
  index: number;
  total: number;
  onSelect: (index: number) => void;
}

interface OutputPreviewProps {
  content: string;
  filename: string;
  format: OutputFormat;
  measure: OutputMeasure;
  chunkNav?: ChunkNav;
  isOversized?: boolean;
}

export function OutputPreview({
  content,
  filename,
  format,
  measure,
  chunkNav,
  isOversized = false,
}: OutputPreviewProps) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const [viewMode, setViewMode] = useState<"rendered" | "raw">("rendered");
  const copyTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Clear any pending copy-confirmation timer on unmount (avoids setState after unmount).
  useEffect(() => () => clearTimeout(copyTimer.current), []);

  const formatInfo = formatters[format];
  const canRender = format === "markdown" || format === "html";

  const handleCopy = async () => {
    clearTimeout(copyTimer.current);
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      copyTimer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API rejects on non-secure contexts or denied permission — surface it.
      setCopyError(true);
      copyTimer.current = setTimeout(() => setCopyError(false), 3000);
    }
  };

  const handleDownload = () => {
    const url = URL.createObjectURL(new Blob([content], { type: formatInfo.mimeType }));
    try {
      const base = sanitizeFilename(filename.replace(".json", ""));
      const partSuffix = chunkNav
        ? `.part-${chunkNav.index + 1}-of-${chunkNav.total}`
        : "";
      const a = document.createElement("a");
      a.href = url;
      a.download = `${base}${partSuffix}.${formatInfo.extension}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } finally {
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto mt-8 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
        <div className="flex flex-col min-w-0">
          <h3 className="text-sm font-medium text-slate-700 truncate max-w-xs">
            {filename}
          </h3>
          <span className="text-xs text-slate-400 whitespace-nowrap">
            {measure.chars.toLocaleString()} chars · ≈{measure.tokens.toLocaleString()} tokens
          </span>
        </div>
        <div className="flex items-center gap-2">
          {chunkNav && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => chunkNav.onSelect(chunkNav.index - 1)}
                disabled={chunkNav.index <= 0}
                aria-label="Previous chunk"
                className="p-1.5 text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:text-slate-900 transition-colors disabled:opacity-40 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-medium text-slate-600 tabular-nums whitespace-nowrap">
                Chunk {chunkNav.index + 1}/{chunkNav.total}
              </span>
              <button
                onClick={() => chunkNav.onSelect(chunkNav.index + 1)}
                disabled={chunkNav.index >= chunkNav.total - 1}
                aria-label="Next chunk"
                className="p-1.5 text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:text-slate-900 transition-colors disabled:opacity-40 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
          {isOversized && (
            <span
              className="px-2 py-0.5 text-xs font-medium bg-amber-50 text-amber-700 rounded-full border border-amber-200 whitespace-nowrap"
              title="A single turn exceeds the chunk budget"
            >
              Oversized
            </span>
          )}
          {canRender && (
            <div className="flex items-center rounded-lg border border-slate-200 overflow-hidden">
              <button
                onClick={() => setViewMode("rendered")}
                className={`px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500 ${
                  viewMode === "rendered"
                    ? "bg-indigo-600 text-white"
                    : "bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                Preview
              </button>
              <button
                onClick={() => setViewMode("raw")}
                className={`px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500 ${
                  viewMode === "raw"
                    ? "bg-indigo-600 text-white"
                    : "bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                Raw
              </button>
            </div>
          )}
          <button
            onClick={handleCopy}
            className="flex items-center px-3 py-1.5 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:text-slate-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
          >
            {copied ? (
              <Check className="w-4 h-4 mr-2 text-emerald-500" />
            ) : (
              <Copy className="w-4 h-4 mr-2" />
            )}
            {copyError ? "Copy failed" : copied ? "Copied" : "Copy"}
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
          >
            <Download className="w-4 h-4 mr-2" />
            Download
          </button>
        </div>
      </div>
      <div className="overflow-y-auto max-h-[600px]">
        {renderBody(content, format, viewMode, canRender)}
      </div>
    </div>
  );
}

function renderBody(
  content: string,
  format: OutputFormat,
  viewMode: "rendered" | "raw",
  canRender: boolean,
) {
  const showRaw = !canRender || viewMode === "raw";

  if (showRaw) {
    return (
      <pre className="p-8 text-sm text-slate-700 whitespace-pre-wrap break-words font-mono">
        {content}
      </pre>
    );
  }

  if (format === "markdown") {
    return (
      <div className="p-8 prose prose-slate prose-indigo max-w-none">
        <Markdown remarkPlugins={[remarkGfm]}>{content}</Markdown>
      </div>
    );
  }

  if (format === "html") {
    return (
      <iframe
        srcDoc={content}
        title="HTML preview"
        sandbox=""
        className="w-full h-[600px] border-0"
      />
    );
  }

  return (
    <pre className="p-8 text-sm text-slate-700 whitespace-pre-wrap break-words font-mono">
      {content}
    </pre>
  );
}
