"use client";

import { useEffect, useRef, useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Download, Copy, Check } from "lucide-react";
import { formatters } from "@/lib/formatters";
import type { OutputFormat } from "@/lib/types";

interface OutputPreviewProps {
  content: string;
  filename: string;
  format: OutputFormat;
}

export function OutputPreview({ content, filename, format }: OutputPreviewProps) {
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
      const a = document.createElement("a");
      a.href = url;
      a.download = `${filename.replace(".json", "")}.${formatInfo.extension}`;
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
        <h3 className="text-sm font-medium text-slate-700 truncate max-w-xs">
          {filename}
        </h3>
        <div className="flex items-center gap-2">
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
