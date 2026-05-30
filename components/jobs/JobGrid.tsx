"use client";

import { JobCard } from "./JobCard";
import { JobCardSkeleton } from "./JobCardSkeleton";
import type { JobWithMatch } from "@/lib/types";
import { SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  jobs: JobWithMatch[];
  loading: boolean;
  onView: (job: JobWithMatch) => void;
  onToggleSave: (job: JobWithMatch) => void;
  onClearFilters?: () => void;
}

export function JobGrid({ jobs, loading, onView, onToggleSave, onClearFilters }: Props) {
  if (loading && jobs.length === 0) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <JobCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (!loading && jobs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-20 text-center">
        <SearchX className="mb-4 h-10 w-10 text-slate-300" />
        <h3 className="text-base font-semibold text-slate-700">No jobs found</h3>
        <p className="mt-1 max-w-sm text-sm text-slate-500">
          Try adjusting your filters or upload a different resume to broaden your matches.
        </p>
        {onClearFilters && (
          <Button variant="outline" size="sm" className="mt-4" onClick={onClearFilters}>
            Clear all filters
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {jobs.map((job) => (
        <JobCard key={job.id} job={job} onView={onView} onToggleSave={onToggleSave} />
      ))}
    </div>
  );
}
