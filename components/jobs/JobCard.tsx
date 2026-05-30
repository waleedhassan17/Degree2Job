"use client";

import { memo } from "react";
import { MapPin, Bookmark, ExternalLink, Clock, Briefcase } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MatchScoreBadge } from "./MatchScoreBadge";
import { SourceBadge } from "./SourceBadge";
import {
  cn,
  formatSalary,
  timeAgo,
  initials,
  JOB_TYPE_LABELS,
} from "@/lib/utils";
import type { JobWithMatch } from "@/lib/types";

interface Props {
  job: JobWithMatch;
  onView: (job: JobWithMatch) => void;
  onToggleSave: (job: JobWithMatch) => void;
}

// Deterministic accent colour per company so the avatars feel intentional.
const AVATAR_COLORS = [
  "bg-blue-100 text-blue-700",
  "bg-violet-100 text-violet-700",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
  "bg-cyan-100 text-cyan-700",
  "bg-indigo-100 text-indigo-700",
];
function avatarColor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

function JobCardImpl({ job, onView, onToggleSave }: Props) {
  const salary = formatSalary(job.salaryMin, job.salaryMax, job.salaryCurrency);
  const skills = (job.requirements || []).filter(Boolean).slice(0, 3);

  return (
    <motion.article
      layout
      whileHover={{ y: -3 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      className="group flex flex-col gap-3.5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:border-primary/40 hover:shadow-md"
    >
      {/* Header: avatar + title/company + score */}
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-sm font-bold",
            avatarColor(job.company)
          )}
          aria-hidden
        >
          {initials(job.company)}
        </div>
        <div className="min-w-0 flex-1">
          <button
            onClick={() => onView(job)}
            className="line-clamp-2 text-left text-[15px] font-semibold leading-snug text-slate-900 transition-colors hover:text-primary"
          >
            {job.title}
          </button>
          <p className="mt-0.5 truncate text-sm text-slate-500">{job.company}</p>
        </div>
        <MatchScoreBadge score={job.match?.score} size="sm" />
      </div>

      {/* Meta row */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-slate-500">
        <span className="inline-flex items-center gap-1">
          <MapPin className="h-3.5 w-3.5" /> {job.city || job.location || "—"}
        </span>
        <span className="inline-flex items-center gap-1">
          <Briefcase className="h-3.5 w-3.5" /> {JOB_TYPE_LABELS[job.jobType]}
        </span>
        <span className="inline-flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" /> {timeAgo(job.postedAt)}
        </span>
      </div>

      {/* AI highlight */}
      {job.match?.highlight && (
        <p className="line-clamp-2 rounded-md bg-primary-50/60 px-2.5 py-1.5 text-xs leading-relaxed text-slate-600">
          {job.match.highlight}
        </p>
      )}

      {/* Salary + skill tags */}
      <div className="flex flex-wrap items-center gap-1.5">
        {salary && (
          <Badge variant="success" className="font-mono">
            {salary}
          </Badge>
        )}
        {skills.map((s) => (
          <Badge key={s} variant="secondary" className="max-w-[140px] truncate">
            {s}
          </Badge>
        ))}
        <SourceBadge source={job.source} />
      </div>

      {/* Footer actions */}
      <div className="mt-auto flex items-center gap-2 border-t border-slate-100 pt-3.5">
        <Button variant="ghost" size="sm" onClick={() => onView(job)} className="flex-1">
          View details
        </Button>
        <Button
          variant="outline"
          size="icon"
          className={cn("h-9 w-9", job.isSaved && "border-primary/40 bg-primary-50")}
          onClick={() => onToggleSave(job)}
          aria-label={job.isSaved ? "Unsave job" : "Save job"}
          aria-pressed={job.isSaved}
        >
          <Bookmark className={cn("h-4 w-4", job.isSaved && "fill-primary text-primary")} />
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
