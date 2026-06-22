"use client";

import { useCallback, useState } from "react";
import { UploadCloud } from "lucide-react";

interface FileUploaderProps {
  onFileSelect: (file: File) => void;
}

export function FileUploader({ onFileSelect }: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        onFileSelect(e.dataTransfer.files[0]);
      }
    },
    [onFileSelect],
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        onFileSelect(e.target.files[0]);
      }
    },
    [onFileSelect],
  );

  return (
    <div
      className={`relative w-full max-w-2xl mx-auto p-8 border-2 border-dashed rounded-2xl transition-colors duration-200 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:ring-offset-2 ${
        isDragging
          ? "border-indigo-500 bg-indigo-50"
          : "border-slate-300 hover:border-slate-400 bg-white"
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        type="file"
        accept=".json,.txt"
        onChange={handleFileInput}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        aria-label="Upload AI Studio export file"
      />

      <div className="flex flex-col items-center justify-center gap-4 text-center pointer-events-none">
        <div className={`p-4 rounded-full ${isDragging ? "bg-indigo-100" : "bg-slate-100"}`}>
          <UploadCloud className={`w-8 h-8 ${isDragging ? "text-indigo-600" : "text-slate-500"}`} />
        </div>
        <div>
          <p className="text-lg font-medium text-slate-900">
            Drop your AI Studio export here
          </p>
          <p className="text-sm text-slate-500 mt-1">
            Accepts .json or .txt exports from Google AI Studio
          </p>
        </div>
        <div className="px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-full">
          Browse Files
        </div>
      </div>
    </div>
  );
}
