"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  ExternalLink,
  Bookmark,
  MapPin,
  Briefcase,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SourceBadge } from "./SourceBadge";
import { MatchBreakdown } from "./MatchBreakdown";
import { CoverLetterModal } from "@/components/cover-letter/CoverLetterModal";
import {
  cn,
  formatSalary,
  timeAgo,
  JOB_TYPE_LABELS,
  SOURCE_LABELS,
} from "@/lib/utils";
import type { JobWithMatch } from "@/lib/types";

interface Props {
  job: JobWithMatch | null;
  resumeId: string | null;
  onClose: () => void;
  onToggleSave: (job: JobWithMatch) => void;
}

export function JobDetail({ job, resumeId, onClose, onToggleSave }: Props) {
  const [coverOpen, setCoverOpen] = useState(false);
  const salary = job && formatSalary(job.salaryMin, job.salaryMax, job.salaryCurrency);

  return (
    <>
      <AnimatePresence>
        {job && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.aside
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed right-0 top-0 z-50 flex h-full w-full max-w-xl flex-col overflow-y-auto bg-white shadow-2xl scrollbar-thin"
              role="dialog"
              aria-label={`Details for ${job.title}`}
            >
              <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-border bg-white/90 p-6 backdrop-blur">
                <div>
                  <h2 className="text-xl font-semibold leading-tight">{job.title}</h2>
                  <p className="mt-1 text-sm text-slate-600">{job.company}</p>
                </div>
                <button
                  onClick={onClose}
                  className="rounded-md p-1 text-slate-400 hover:bg-surface hover:text-slate-700"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-6 p-6">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  {job.city && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-surface px-2.5 py-1">
                      <MapPin className="h-3.5 w-3.5" /> {job.city}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1 rounded-full bg-surface px-2.5 py-1">
                    <Briefcase className="h-3.5 w-3.5" /> {JOB_TYPE_LABELS[job.jobType]}
                  </span>
                  {salary && (
                    <Badge variant="success" className="font-mono">
                      {salary}
                    </Badge>
                  )}
                  <SourceBadge source={job.source} />
                  <span className="text-slate-400">{timeAgo(job.postedAt)}</span>
                </div>

                <a
                  href={job.applyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  Originally posted on {SOURCE_LABELS[job.source]}
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>

                {job.match && (
                  <div className="rounded-lg border border-border bg-surface/60 p-5">
                    <MatchBreakdown match={job.match} />
                  </div>
                )}

                {job.requirements.length > 0 && (
                  <div>
                    <h3 className="mb-2 text-sm font-semibold text-slate-700">Requirements</h3>
                    <ul className="list-disc space-y-1 pl-5 text-sm text-slate-600">
                      {job.requirements.map((req, i) => (
                        <li key={i}>{req}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div>
                  <h3 className="mb-2 text-sm font-semibold text-slate-700">Job Description</h3>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-600">
                    {job.description || "No description provided for this listing."}
                  </p>
                </div>
              </div>

              <div className="sticky bottom-0 mt-auto flex items-center gap-2 border-t border-border bg-white/90 p-4 backdrop-blur">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => onToggleSave(job)}
                  aria-label={job.isSaved ? "Unsave" : "Save"}
                  aria-pressed={job.isSaved}
                >
                  <Bookmark
                    className={cn("h-4 w-4", job.isSaved && "fill-primary text-primary")}
                  />
                </Button>
                <Button
                  variant="secondary"
                  className="flex-1"
                  onClick={() => setCoverOpen(true)}
                  disabled={!resumeId}
                >
                  <Sparkles className="h-4 w-4" /> Generate Cover Letter
                </Button>
                <Button asChild className="flex-1">
                  <a href={job.applyUrl} target="_blank" rel="noopener noreferrer">
                    Apply on {SOURCE_LABELS[job.source]}
                  </a>
                </Button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <CoverLetterModal
        job={job}
        resumeId={resumeId}
        open={coverOpen}
        onOpenChange={setCoverOpen}
      />
    </>
  );
}
