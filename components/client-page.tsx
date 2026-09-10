"use client";

import { useState, useMemo } from "react";
import { FileUploader } from "./file-uploader";
import { OutputPreview } from "./output-preview";
import { MetadataPanel } from "./metadata-panel";
import { TurnSelector } from "./turn-selector";
import { ChunkControls } from "./chunk-controls";
import { parseAIStudioExport } from "@/lib/parser";
import { formatters } from "@/lib/formatters";
import { createFullSelection, filterTurns } from "@/lib/turn-selection";
import {
  buildChunks,
  computeTurnWeights,
  DEFAULT_CHUNK_BUDGET,
  parseBudgetInput,
  type ConversationChunk,
} from "@/lib/chunking";
import { measureOutput, type OutputMeasure } from "@/lib/tokens";
import type {
  ConversationIR,
  ModelPersona,
  OutputFormat,
  RunSettings,
} from "@/lib/types";

interface SingleResult {
  kind: "single";
  content: string;
  measure: OutputMeasure;
}

interface ChunkedResult {
  kind: "chunked";
  chunks: ConversationChunk[];
}

interface FailedResult {
  kind: "failed";
  error: string;
}

type OutputResult = SingleResult | ChunkedResult | FailedResult;

export function ClientPage() {
  const [rawJson, setRawJson] = useState<{ content: unknown; filename: string } | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const [includeThinking, setIncludeThinking] = useState(true);
  const [showSystemInstructions, setShowSystemInstructions] = useState(true);
  const [modelPersona, setModelPersona] = useState<ModelPersona>("gemini");
  const [outputFormat, setOutputFormat] = useState<OutputFormat>("markdown");

  // null = every turn selected; a new file implicitly resets to full.
  const [selectedTurns, setSelectedTurns] = useState<Set<number> | null>(null);
  const [isChunkingEnabled, setChunkingEnabled] = useState(false);
  const [chunkBudgetInput, setChunkBudgetInput] = useState(
    String(DEFAULT_CHUNK_BUDGET),
  );
  const [includePartHeader, setIncludePartHeader] = useState(true);
  const [activeChunkIndex, setActiveChunkIndex] = useState(0);

  // Parse once per file: selection clicks and option toggles must never
  // re-run parseAIStudioExport on a multi-megabyte JSON payload.
  const parsed = useMemo(() => {
    if (!rawJson) return null;
    try {
      return {
        ir: parseAIStudioExport(rawJson.content, rawJson.filename),
        error: null as string | null,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "An error occurred while parsing the file.";
      return { ir: null as ConversationIR | null, error: msg };
    }
  }, [rawJson]);

  const ir = parsed?.ir ?? null;
  const runSettings: RunSettings | null = ir?.runSettings ?? null;

  const effectiveSelection = useMemo(
    () => (ir ? selectedTurns ?? createFullSelection(ir.turns.length) : null),
    [ir, selectedTurns],
  );

  // Weights depend on the selected turns and format options but NOT on the
  // budget input — typing in the budget field must not re-run the per-turn
  // standalone formatting pass.
  const weights = useMemo(() => {
    if (!ir || !effectiveSelection || !isChunkingEnabled) return null;
    return computeTurnWeights(filterTurns(ir, effectiveSelection), outputFormat, {
      includeThinking,
      modelPersona,
      showSystemInstructions,
    });
  }, [
    ir,
    effectiveSelection,
    isChunkingEnabled,
    outputFormat,
    includeThinking,
    modelPersona,
    showSystemInstructions,
  ]);

  const output: OutputResult | null = useMemo(() => {
    if (!ir || !effectiveSelection) return null;
    try {
      const selectedIr = filterTurns(ir, effectiveSelection);
      const formatOptions = { includeThinking, modelPersona, showSystemInstructions };
      if (!isChunkingEnabled) {
        const content = formatters[outputFormat].format(selectedIr, formatOptions);
        return { kind: "single", content, measure: measureOutput(content) };
      }
      if (!weights) return { kind: "failed", error: "Chunk weights unavailable." };
      const chunks = buildChunks(selectedIr, outputFormat, formatOptions, {
        budget: parseBudgetInput(chunkBudgetInput),
        includePartHeader,
      }, weights);
      return { kind: "chunked", chunks };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "An error occurred while formatting the output.";
      return { kind: "failed", error: msg };
    }
  }, [
    ir,
    effectiveSelection,
    isChunkingEnabled,
    outputFormat,
    includeThinking,
    modelPersona,
    showSystemInstructions,
    chunkBudgetInput,
    includePartHeader,
    weights,
  ]);

  const error =
    fileError ||
    parsed?.error ||
    (output?.kind === "failed" ? output.error : null);

  // Budget or selection changes can shrink the chunk list below the stored
  // index — clamp as a derived value instead of setState during render.
  const activeChunk =
    output?.kind === "chunked" && output.chunks.length > 0
      ? output.chunks[Math.min(activeChunkIndex, output.chunks.length - 1)]
      : null;

  const handleReset = () => {
    setFileError(null);
    setRawJson(null);
    setSelectedTurns(null);
    setActiveChunkIndex(0);
  };

  const handleFileSelect = async (file: File) => {
    setFileError(null);
    try {
      // Guard against a huge accidental file freezing the tab while reading/parsing.
      const MAX_FILE_BYTES = 25 * 1024 * 1024; // 25 MB
      if (file.size > MAX_FILE_BYTES) {
        throw new Error("File is too large (over 25 MB). Please upload a Google AI Studio export.");
      }
      const text = await file.text();
      let jsonContent: unknown;
      try {
        jsonContent = JSON.parse(text);
      } catch {
        throw new Error("Invalid JSON file. Please upload a valid AI Studio export.");
      }
      setRawJson({ content: jsonContent, filename: file.name });
      setSelectedTurns(null);
      setActiveChunkIndex(0);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "An error occurred while reading the file.";
      setFileError(msg);
      setRawJson(null);
    }
  };

  return (
    <div className="flex flex-col items-center w-full">
      <FileUploader onFileSelect={handleFileSelect} />

      {rawJson && (
        <div className="w-full max-w-4xl mx-auto mt-8 p-6 bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col gap-4">
          <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeThinking}
                  onChange={(e) => setIncludeThinking(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                />
                <span className="text-sm font-medium text-slate-700">Show Thinking</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showSystemInstructions}
                  onChange={(e) => setShowSystemInstructions(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                />
                <span className="text-sm font-medium text-slate-700">Show System Instructions</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isChunkingEnabled}
                  onChange={(e) => setChunkingEnabled(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                />
                <span className="text-sm font-medium text-slate-700">Split into Chunks</span>
              </label>
            </div>

            <button
              onClick={handleReset}
              className="px-3 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:text-slate-900 transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
            >
              New File
            </button>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
            <div className="flex items-center gap-3 flex-1">
              <label htmlFor="format" className="text-sm font-medium text-slate-700 whitespace-nowrap">
                Export Format:
              </label>
              <select
                id="format"
                value={outputFormat}
                onChange={(e) => setOutputFormat(e.target.value as OutputFormat)}
                className="block w-full rounded-lg border border-slate-300 py-2 pl-3 pr-10 text-sm bg-slate-50 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
              >
                <option value="markdown">Markdown (.md)</option>
                <option value="xml">XML (.xml)</option>
                <option value="html">HTML (.html)</option>
                <option value="plain-text">Plain Text (.txt)</option>
              </select>
            </div>

            <div className="flex items-center gap-3 flex-1">
              <label htmlFor="persona" className="text-sm font-medium text-slate-700 whitespace-nowrap">
                Role Labels:
              </label>
              <select
                id="persona"
                value={modelPersona}
                onChange={(e) => setModelPersona(e.target.value as ModelPersona)}
                className="block w-full rounded-lg border border-slate-300 py-2 pl-3 pr-10 text-sm bg-slate-50 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
              >
                <option value="gemini">Gemini (User / Model)</option>
                <option value="chatgpt">ChatGPT (User / ChatGPT)</option>
                <option value="claude">Claude (User / Claude)</option>
                <option value="grok">Grok (User / Grok)</option>
                <option value="llama">Llama (User / Llama)</option>
                <option value="mistral">Mistral (User / Mistral)</option>
                <option value="deepseek">DeepSeek (User / DeepSeek)</option>
              </select>
            </div>
          </div>

          {outputFormat === "xml" && (
            <p className="text-xs text-slate-500 -mt-2">
              Note: XML exports use <code className="px-1 py-0.5 bg-slate-100 rounded text-slate-700">role=&quot;user&quot;</code> and <code className="px-1 py-0.5 bg-slate-100 rounded text-slate-700">role=&quot;assistant&quot;</code> for maximum LLM compatibility. The Role Labels setting above only affects Markdown, Plain Text, and HTML exports.
            </p>
          )}

          {isChunkingEnabled && (
            <ChunkControls
              budgetInput={chunkBudgetInput}
              onBudgetInputChange={setChunkBudgetInput}
              includePartHeader={includePartHeader}
              onIncludePartHeaderChange={setIncludePartHeader}
              chunkCount={output?.kind === "chunked" ? output.chunks.length : null}
            />
          )}
        </div>
      )}

      {ir && effectiveSelection && (
        <TurnSelector
          key={rawJson?.filename}
          turns={ir.turns}
          selection={effectiveSelection}
          onSelectionChange={setSelectedTurns}
        />
      )}

      {error && (
        <div className="mt-8 p-4 bg-red-50 text-red-700 rounded-xl border border-red-200 max-w-2xl w-full text-center">
          {error}
        </div>
      )}

      {output && output.kind !== "failed" && runSettings && (
        <MetadataPanel settings={runSettings} />
      )}

      {output?.kind === "single" && (
        <OutputPreview
          content={output.content}
          filename={ir?.title ?? ""}
          format={outputFormat}
          measure={output.measure}
        />
      )}

      {output?.kind === "chunked" && output.chunks.length === 0 && (
        <div className="mt-8 p-4 bg-amber-50 text-amber-700 rounded-xl border border-amber-200 max-w-2xl w-full text-center">
          No turns selected — select at least one turn to export.
        </div>
      )}

      {activeChunk && output?.kind === "chunked" && (
        <OutputPreview
          content={activeChunk.content}
          filename={ir?.title ?? ""}
          format={outputFormat}
          measure={{
            chars: activeChunk.charCount,
            tokens: activeChunk.tokenEstimate,
          }}
          chunkNav={{
            index: Math.min(activeChunkIndex, output.chunks.length - 1),
            total: output.chunks.length,
            onSelect: setActiveChunkIndex,
          }}
          isOversized={activeChunk.isOversized}
        />
      )}
    </div>
  );
}
