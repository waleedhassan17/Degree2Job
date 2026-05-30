"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";
import { useAppStore } from "@/store";
import { PK_CITIES, SOURCE_LABELS, JOB_TYPE_LABELS } from "@/lib/utils";
import type { JobSource, JobType } from "@/lib/types";

const JOB_TYPES = Object.keys(JOB_TYPE_LABELS) as JobType[];
const SOURCES = Object.keys(SOURCE_LABELS) as JobSource[];
const LEVELS = ["fresher", "junior", "mid", "senior"] as const;
const POSTED = [
  { value: "24h", label: "Last 24h" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "all", label: "Any time" },
] as const;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2 border-b border-border pb-4">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {title}
      </h3>
      {children}
    </div>
  );
}

function toggle(arr: string[], value: string): string[] {
  return arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
}

export function FilterSidebar() {
  const { filters, setFilters, resetFilters } = useAppStore();

  const activeCount =
    filters.city.length +
    filters.jobType.length +
    filters.source.length +
    filters.experienceLevel.length +
    (filters.postedWithin !== "all" ? 1 : 0) +
    (filters.query ? 1 : 0) +
    (filters.salaryMin ? 1 : 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Filters</h2>
        {activeCount > 0 && (
          <button
            onClick={resetFilters}
            className="text-xs font-medium text-primary hover:underline"
          >
            Clear all ({activeCount})
          </button>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          value={filters.query}
          onChange={(e) => setFilters({ query: e.target.value })}
          placeholder="Search title or company"
          className="pl-9"
          aria-label="Search jobs"
        />
      </div>

      <Section title="City">
        {PK_CITIES.map((city) => (
          <label key={city} className="flex cursor-pointer items-center gap-2 text-sm">
            <Checkbox
              checked={filters.city.includes(city)}
              onCheckedChange={() => setFilters({ city: toggle(filters.city, city) })}
            />
            {city}
          </label>
        ))}
      </Section>

      <Section title="Job Type">
        {JOB_TYPES.map((type) => (
          <label key={type} className="flex cursor-pointer items-center gap-2 text-sm">
            <Checkbox
              checked={filters.jobType.includes(type)}
              onCheckedChange={() => setFilters({ jobType: toggle(filters.jobType, type) })}
            />
            {JOB_TYPE_LABELS[type]}
          </label>
        ))}
      </Section>

      <Section title="Experience Level">
        {LEVELS.map((level) => (
          <label key={level} className="flex cursor-pointer items-center gap-2 text-sm capitalize">
            <Checkbox
              checked={filters.experienceLevel.includes(level)}
              onCheckedChange={() =>
                setFilters({ experienceLevel: toggle(filters.experienceLevel, level) })
              }
            />
            {level}
          </label>
        ))}
      </Section>

      <Section title="Source Platform">
        {SOURCES.map((source) => (
          <label key={source} className="flex cursor-pointer items-center gap-2 text-sm">
            <Checkbox
              checked={filters.source.includes(source)}
              onCheckedChange={() => setFilters({ source: toggle(filters.source, source) })}
            />
            {SOURCE_LABELS[source]}
          </label>
        ))}
      </Section>

      <Section title="Date Posted">
        <div className="flex flex-wrap gap-2">
          {POSTED.map((opt) => (
            <Badge
              key={opt.value}
              variant={filters.postedWithin === opt.value ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => setFilters({ postedWithin: opt.value })}
            >
              {opt.label}
            </Badge>
          ))}
        </div>
      </Section>

      <div className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          Min Salary (PKR)
        </h3>
        <Slider
          value={[filters.salaryMin ?? 0]}
          min={0}
          max={500000}
          step={10000}
          onValueChange={([v]) => setFilters({ salaryMin: v || undefined })}
        />
        <p className="font-mono text-xs text-slate-500">
          {filters.salaryMin ? `PKR ${filters.salaryMin.toLocaleString()}+` : "Any"}
        </p>
      </div>

      <Button variant="outline" className="w-full" onClick={resetFilters}>
        Reset Filters
      </Button>
    </div>
  );
}
