"use client";

import { useState } from "react";
import { ApplicationCard } from "./ApplicationCard";
import { cn } from "@/lib/utils";
import type { SavedJob, ApplicationStatus } from "@/lib/types";

const COLUMNS: { status: ApplicationStatus; label: string; accent: string }[] = [
  { status: "saved", label: "Saved", accent: "border-t-slate-400" },
  { status: "applied", label: "Applied", accent: "border-t-primary" },
  { status: "interview", label: "Interview", accent: "border-t-amber-500" },
  { status: "offer", label: "Offer", accent: "border-t-emerald-500" },
  { status: "rejected", label: "Rejected", accent: "border-t-rose-500" },
];

interface Props {
  items: SavedJob[];
  onStatusChange: (jobId: string, status: ApplicationStatus) => void;
  onSelect?: (saved: SavedJob) => void;
}

export function StatusKanban({ items, onStatusChange, onSelect }: Props) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [overColumn, setOverColumn] = useState<ApplicationStatus | null>(null);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {COLUMNS.map((col) => {
        const colItems = items.filter((i) => i.status === col.status);
        return (
          <div
            key={col.status}
            onDragOver={(e) => {
              e.preventDefault();
              setOverColumn(col.status);
            }}
            onDragLeave={() => setOverColumn(null)}
            onDrop={() => {
              if (dragId) onStatusChange(dragId, col.status);
              setDragId(null);
              setOverColumn(null);
            }}
            className={cn(
              "flex min-h-[200px] flex-col gap-3 rounded-lg border-t-2 bg-surface p-3 transition-colors",
              col.accent,
              overColumn === col.status && "ring-2 ring-primary/40"
            )}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-700">{col.label}</h3>
              <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-slate-500">
                {colItems.length}
              </span>
            </div>

            <div className="flex flex-col gap-2">
              {colItems.map((saved) => (
                <ApplicationCard
                  key={saved.id}
                  saved={saved}
                  draggable
                  onDragStart={() => setDragId(saved.jobId)}
                  onClick={() => onSelect?.(saved)}
                />
              ))}
              {colItems.length === 0 && (
                <p className="rounded-md border border-dashed border-slate-200 py-6 text-center text-xs text-slate-400">
                  Drop jobs here
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
