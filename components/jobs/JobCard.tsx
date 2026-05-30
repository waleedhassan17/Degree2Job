"use client";

import { memo } from "react";
import { MapPin, Bookmark, ExternalLink } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MatchScoreBadge } from "./MatchScoreBadge";
import { SourceBadge } from "./SourceBadge";
import {
  cn,
  formatSalary,
  timeAgo,
  JOB_TYPE_LABELS,
} from "@/lib/utils";
import type { JobWithMatch } from "@/lib/types";

interface Props {
  job: JobWithMatch;
  onView: (job: JobWithMatch) => void;
  onToggleSave: (job: JobWithMatch) => void;
}

function JobCardImpl({ job, onView, onToggleSave }: Props) {
  const salary = formatSalary(job.salaryMin, job.salaryMax, job.salaryCurrency);

  return (
    <motion.article
      layout
      whileHover={{ y: -1 }}
      transition={{ duration: 0.12, ease: "easeOut" }}
      className="group flex flex-col gap-3 rounded-lg border border-border bg-white p-5 transition-colors hover:border-primary/40"
    >
      <div className="flex items-start justify-between gap-3">
        <button
          onClick={() => onView(job)}
          className="text-left text-base font-semibold leading-snug text-slate-900 hover:text-primary"
        >
          {job.title}
        </button>
        <MatchScoreBadge score={job.match?.score} />
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
        <span className="font-medium">{job.company}</span>
        {job.city && (
          <span className="inline-flex items-center gap-1 rounded-full bg-surface px-2 py-0.5 text-xs">
            <MapPin className="h-3 w-3" /> {job.city}
          </span>
        )}
        <SourceBadge source={job.source} />
      </div>

      {job.match?.highlight && (
        <p className="line-clamp-2 text-sm text-slate-500">{job.match.highlight}</p>
      )}

      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
        {salary && (
          <Badge variant="success" className="font-mono">
            {salary}
          </Badge>
        )}
        <Badge variant="outline">{JOB_TYPE_LABELS[job.jobType]}</Badge>
        <span>{timeAgo(job.postedAt)}</span>
      </div>

      <div className="mt-1 flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => onView(job)} className="flex-1">
          View Details
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => onToggleSave(job)}
          aria-label={job.isSaved ? "Unsave job" : "Save job"}
          aria-pressed={job.isSaved}
        >
          <Bookmark
            className={cn(
              "h-4 w-4",
              job.isSaved && "fill-primary text-primary"
            )}
          />
        </Button>
        <Button asChild size="sm">
          <a href={job.applyUrl} target="_blank" rel="noopener noreferrer">
            Apply <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </Button>
      </div>
    </motion.article>
  );
}

export const JobCard = memo(JobCardImpl);
