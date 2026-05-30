"use client";

import { Building2, Clock } from "lucide-react";
import { timeAgo } from "@/lib/utils";
import type { SavedJob } from "@/lib/types";

interface Props {
  saved: SavedJob;
  onClick?: () => void;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
}

export function ApplicationCard({ saved, onClick, draggable, onDragStart }: Props) {
  const job = saved.job;
  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      onClick={onClick}
      className="cursor-pointer rounded-lg border border-border bg-white p-3 shadow-sm transition-shadow hover:shadow-md"
    >
      <p className="line-clamp-2 text-sm font-medium text-slate-800">
        {job?.title ?? "Job"}
      </p>
      <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
        <Building2 className="h-3 w-3" /> {job?.company ?? "—"}
      </p>
      <p className="mt-2 flex items-center gap-1 text-[11px] text-slate-400">
        <Clock className="h-3 w-3" /> Updated {timeAgo(saved.appliedAt ?? saved.createdAt)}
      </p>
    </div>
  );
}
