"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { SlidersHorizontal, Sparkles, X } from "lucide-react";
import { FilterSidebar } from "@/components/jobs/FilterSidebar";
import { JobGrid } from "@/components/jobs/JobGrid";
import { JobDetail } from "@/components/jobs/JobDetail";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useJobs } from "@/hooks/useJobs";
import { useJobMatch } from "@/hooks/useJobMatch";
import { useSavedJobs } from "@/hooks/useSavedJobs";
import { useAppStore } from "@/store";
import type { SortKey } from "@/lib/matching";
import type { JobWithMatch } from "@/lib/types";
import { SOURCE_LABELS } from "@/lib/utils";

const PAGE_SIZE = 12;

export default function JobsPage() {
  const { profile, resumeId, resetFilters, hasHydrated } = useAppStore();
  const [sort, setSort] = useState<SortKey>("match");
  const { jobs, isLoading, sourceBreakdown } = useJobs(sort);
  const { toggle } = useSavedJobs();
  const match = useJobMatch();

  const [selected, setSelected] = useState<JobWithMatch | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [visible, setVisible] = useState(PAGE_SIZE);

  // Kick off AI matching for any jobs that don't yet have a score.
  const matchedRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!resumeId || !jobs.length) return;
    const unmatched = jobs
      .filter((j) => !j.match && !matchedRef.current.has(j.id))
      .slice(0, 20)
      .map((j) => j.id);
    if (unmatched.length) {
      unmatched.forEach((id) => matchedRef.current.add(id));
      match.mutate(unmatched);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobs, resumeId]);

  // Infinite scroll sentinel.
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadMore = useCallback(() => {
    setVisible((v) => Math.min(v + PAGE_SIZE, jobs.length));
  }, [jobs.length]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => entries[0].isIntersecting && loadMore(),
      { rootMargin: "400px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [loadMore]);

  if (!hasHydrated) {
    return (
      <div className="container flex items-center justify-center py-32 text-slate-400">
        <Sparkles className="mr-2 h-5 w-5 animate-pulse text-primary" /> Loading…
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="container py-12">
        <div className="relative flex flex-col items-center justify-center overflow-hidden rounded-2xl px-6 py-28 text-center">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage:
                "url('https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=2400&q=80')",
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950/85 via-slate-900/80 to-primary-900/90" />
          <div className="relative flex flex-col items-center">
            <Sparkles className="mb-4 h-10 w-10 text-sky-400" />
            <h2 className="text-xl font-semibold text-white">
              Upload your resume to see matches
            </h2>
            <p className="mt-2 max-w-sm text-sm text-slate-300">
              We score every job against your skills so the best fits show up first.
            </p>
            <Button asChild className="mt-6">
              <Link href="/upload">Upload Resume</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const shown = jobs.slice(0, visible);

  return (
    <div className="container py-8">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Matched jobs</h1>
          <p className="mt-1 text-sm text-slate-500">
            {jobs.length} roles for{" "}
            <span className="font-medium text-slate-700">{profile.preferredRole}</span>
            {match.isPending && " · scoring matches…"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="lg:hidden"
            onClick={() => setShowFilters(true)}
          >
            <SlidersHorizontal className="h-4 w-4" /> Filters
          </Button>
          <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="match">Best match</SelectItem>
              <SelectItem value="recent">Most recent</SelectItem>
              <SelectItem value="salary">Highest salary</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {sourceBreakdown.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          {sourceBreakdown.map((s) => (
            <Badge
              key={s.source}
              variant={s.status === "ok" ? "secondary" : "outline"}
              className={s.status === "unavailable" ? "opacity-50" : ""}
            >
              {SOURCE_LABELS[s.source]}: {s.status === "ok" ? s.count : "—"}
            </Badge>
          ))}
        </div>
      )}

      <div className="flex gap-8">
        <aside className="hidden w-64 shrink-0 lg:block">
          <div className="sticky top-20">
            <FilterSidebar />
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <JobGrid
            jobs={shown}
            loading={isLoading}
            onView={setSelected}
            onToggleSave={toggle}
            onClearFilters={resetFilters}
          />
          {visible < jobs.length && <div ref={sentinelRef} className="h-10" />}
        </div>
      </div>

      {/* Mobile filter drawer */}
      {showFilters && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-slate-900/40"
            onClick={() => setShowFilters(false)}
          />
          <div className="absolute right-0 top-0 h-full w-80 max-w-[85%] overflow-y-auto bg-white p-5 scrollbar-thin">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-semibold">Filters</h2>
              <button onClick={() => setShowFilters(false)} aria-label="Close filters">
                <X className="h-5 w-5" />
              </button>
            </div>
            <FilterSidebar />
          </div>
        </div>
      )}

      <JobDetail
        job={selected}
        resumeId={resumeId}
        onClose={() => setSelected(null)}
        onToggleSave={toggle}
      />
    </div>
  );
}
