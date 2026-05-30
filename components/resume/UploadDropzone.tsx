"use client";

import { useCallback, useRef, useState } from "react";
import { UploadCloud, FileText, Loader2, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export type UploadStage =
  | "idle"
  | "uploading"
  | "extracting"
  | "parsing"
  | "done"
  | "error";

const STAGE_LABEL: Record<UploadStage, string> = {
  idle: "",
  uploading: "Uploading your resume…",
  extracting: "Extracting text…",
  parsing: "Analyzing with AI…",
  done: "Done!",
  error: "Something went wrong",
};

interface Props {
  stage: UploadStage;
  error?: string | null;
  onFile: (file: File) => void;
}

const ACCEPTED = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const MAX_BYTES = 5 * 1024 * 1024;

export function UploadDropzone({ stage, error, onFile }: Props) {
  const [dragOver, setDragOver] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateAndSend = useCallback(
    (file: File) => {
      setLocalError(null);
      if (!ACCEPTED.includes(file.type)) {
        setLocalError("Please upload a PDF or DOCX file.");
        return;
      }
      if (file.size > MAX_BYTES) {
        setLocalError("File is too large. Maximum size is 5MB.");
        return;
      }
      onFile(file);
    },
    [onFile]
  );

  const busy = stage === "uploading" || stage === "extracting" || stage === "parsing";
  const shownError = error || localError;

  return (
    <div className="w-full">
      <div
        onClick={() => !busy && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          if (!busy) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (busy) return;
          const file = e.dataTransfer.files?.[0];
          if (file) validateAndSend(file);
        }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && !busy) inputRef.current?.click();
        }}
        aria-label="Upload resume"
        className={cn(
          "flex min-h-[240px] cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 text-center transition-colors",
          dragOver ? "border-primary bg-primary-50" : "border-slate-300 hover:border-primary/60",
          busy && "pointer-events-none opacity-90"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.docx"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) validateAndSend(file);
            e.target.value = "";
          }}
        />

        {busy ? (
          <>
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-sm font-medium text-slate-700">{STAGE_LABEL[stage]}</p>
            <ProgressDots stage={stage} />
          </>
        ) : (
          <>
            <motion.div
              animate={{ y: dragOver ? -4 : 0 }}
              className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-50 text-primary"
            >
              <UploadCloud className="h-7 w-7" />
            </motion.div>
            <div>
              <p className="text-base font-medium text-slate-800">
                Drag your resume here or click to browse
              </p>
              <p className="mt-1 flex items-center justify-center gap-1 text-xs text-slate-500">
                <FileText className="h-3.5 w-3.5" /> PDF, DOCX · Max 5MB
              </p>
            </div>
          </>
        )}
      </div>

      {shownError && (
        <p className="mt-3 flex items-center gap-1.5 text-sm text-rose-600">
          <AlertCircle className="h-4 w-4" /> {shownError}
        </p>
      )}
    </div>
  );
}

function ProgressDots({ stage }: { stage: UploadStage }) {
  const stages: UploadStage[] = ["uploading", "extracting", "parsing"];
  const activeIndex = stages.indexOf(stage);
  return (
    <div className="mt-2 flex items-center gap-2">
      {stages.map((s, i) => (
        <span
          key={s}
          className={cn(
            "h-1.5 w-8 rounded-full transition-colors",
            i <= activeIndex ? "bg-primary" : "bg-slate-200"
          )}
        />
      ))}
    </div>
  );
}
