"use client";

interface Props {
  text: string;
  streaming: boolean;
}

export function StreamingText({ text, streaming }: Props) {
  return (
    <div className="whitespace-pre-wrap rounded-lg border border-border bg-surface p-5 text-sm leading-relaxed text-slate-700">
      {text}
      {streaming && (
        <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-primary align-middle" />
      )}
      {!text && !streaming && (
        <span className="text-slate-400">Your cover letter will appear here…</span>
      )}
    </div>
  );
}
