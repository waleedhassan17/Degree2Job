"use client";

import { useState, useCallback } from "react";
import { Copy, Download, RefreshCw, Check, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { StreamingText } from "./StreamingText";
import type { JobWithMatch } from "@/lib/types";

interface Props {
  job: JobWithMatch | null;
  resumeId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CoverLetterModal({ job, resumeId, open, onOpenChange }: Props) {
  const [text, setText] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(async () => {
    if (!job || !resumeId) return;
    setText("");
    setError(null);
    setStreaming(true);
    try {
      const res = await fetch("/api/cover-letter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeId, jobId: job.id }),
      });
      if (!res.ok || !res.body) {
        throw new Error("Failed to generate cover letter");
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        setText((prev) => prev + decoder.decode(value, { stream: true }));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setStreaming(false);
    }
  }, [job, resumeId]);

  // Auto-start generation when the modal opens with no content yet.
  const handleOpenChange = (next: boolean) => {
    onOpenChange(next);
    if (next && !text && !streaming) {
      void generate();
    }
    if (!next) {
      setText("");
      setError(null);
    }
  };

  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadDocx = () => {
    // Lightweight .doc export: HTML body recognized by Word.
    const html = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'></head><body><div style="font-family:Calibri,Arial,sans-serif;font-size:11pt;white-space:pre-wrap">${text.replace(
      /&/g,
      "&amp;"
    )}</div></body></html>`;
    const blob = new Blob([html], { type: "application/msword" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cover-letter-${job?.company ?? "job"}.doc`.replace(/\s+/g, "-");
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Cover Letter</DialogTitle>
          <DialogDescription>
            {job ? `For ${job.title} at ${job.company}` : ""}
          </DialogDescription>
        </DialogHeader>

        {error ? (
          <div className="rounded-md border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            {error}
          </div>
        ) : (
          <StreamingText text={text} streaming={streaming} />
        )}

        <div className="flex flex-wrap items-center gap-2 pt-2">
          <Button onClick={copy} variant="outline" size="sm" disabled={!text || streaming}>
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied" : "Copy"}
          </Button>
          <Button onClick={downloadDocx} variant="outline" size="sm" disabled={!text || streaming}>
            <Download className="h-4 w-4" /> Download .docx
          </Button>
          <Button onClick={generate} size="sm" disabled={streaming} className="ml-auto">
            {streaming ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            {streaming ? "Generating…" : "Regenerate"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
