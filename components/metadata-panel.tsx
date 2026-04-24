"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { RunSettings } from "@/lib/types";

interface MetadataPanelProps {
  settings: RunSettings;
}

export function MetadataPanel({ settings }: MetadataPanelProps) {
  const [expanded, setExpanded] = useState(false);

  const prettyModel = settings.model
    ? settings.model.replace(/^models\//, "")
    : "Unknown model";

  const tools: { label: string; enabled: boolean }[] = [
    { label: "Google Search", enabled: settings.googleSearch },
    { label: "Code Execution", enabled: settings.codeExecution },
    { label: "Browse", enabled: settings.browse },
    { label: "Maps", enabled: settings.maps },
    { label: "Image Search", enabled: settings.imageSearch },
  ];
  const enabledTools = tools.filter((t) => t.enabled);

  return (
    <div className="w-full max-w-4xl mx-auto mt-4 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors text-left"
      >
        <div className="flex items-center gap-3 flex-wrap">
          {expanded ? (
            <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
          ) : (
            <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
          )}
          <span className="text-sm font-medium text-slate-700">Run Settings</span>
          <span className="text-sm text-slate-500">·</span>
          <span className="text-sm font-mono text-indigo-600">{prettyModel}</span>
          {settings.thinkingLevel && (
            <>
              <span className="text-sm text-slate-500">·</span>
              <span className="text-xs font-medium text-slate-500">
                {formatThinkingLevel(settings.thinkingLevel)}
              </span>
            </>
          )}
          {enabledTools.length > 0 && (
            <div className="flex items-center gap-1.5 ml-1">
              {enabledTools.map((t) => (
                <span
                  key={t.label}
                  className="px-2 py-0.5 text-xs font-medium bg-emerald-50 text-emerald-700 rounded-full border border-emerald-100"
                >
                  {t.label}
                </span>
              ))}
            </div>
          )}
        </div>
      </button>

      {expanded && (
        <div className="px-6 pb-5 pt-1 border-t border-slate-100 bg-slate-50/50">
          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-3 mt-4">
            <MetaField label="Model" value={prettyModel} mono />
            <MetaField label="Thinking Level" value={formatThinkingLevel(settings.thinkingLevel)} />
            <MetaField label="Temperature" value={formatNumber(settings.temperature)} />
            <MetaField label="Max Output Tokens" value={formatNumber(settings.maxOutputTokens)} />
            <MetaField label="Top P" value={formatNumber(settings.topP)} />
            <MetaField label="Top K" value={formatNumber(settings.topK)} />
          </dl>

          <div className="mt-4">
            <dt className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
              Tools
            </dt>
            <dd className="flex flex-wrap gap-2">
              {tools.map((t) => (
                <span
                  key={t.label}
                  className={`px-2.5 py-1 text-xs font-medium rounded-full border ${
                    t.enabled
                      ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                      : "bg-slate-100 text-slate-400 border-slate-200"
                  }`}
                >
                  {t.enabled ? "✓" : "○"} {t.label}
                </span>
              ))}
            </dd>
          </div>
        </div>
      )}
    </div>
  );
}

function MetaField({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <dt className="text-xs font-medium text-slate-500 uppercase tracking-wide">
        {label}
      </dt>
      <dd className={`text-sm text-slate-800 mt-0.5 ${mono ? "font-mono" : ""}`}>
        {value}
      </dd>
    </div>
  );
}

function formatNumber(n: number | null): string {
  if (n === null || n === undefined) return "—";
  return n.toString();
}

function formatThinkingLevel(level: string | null): string {
  if (!level) return "—";
  // "THINKING_HIGH" -> "High"
  return level
    .replace(/^THINKING_/, "")
    .toLowerCase()
    .replace(/^\w/, (c) => c.toUpperCase());
}
