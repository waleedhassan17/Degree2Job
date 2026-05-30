"use client";

import { motion } from "framer-motion";
import { Check, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { JobMatch } from "@/lib/types";

const RADIUS = 52;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function ringColor(score: number) {
  if (score >= 80) return "#10b981";
  if (score >= 60) return "#f59e0b";
  return "#f43f5e";
}

function verdictLabel(score: number) {
  if (score >= 80) return "Excellent match";
  if (score >= 60) return "Good match";
  if (score >= 50) return "Fair match";
  return "Low match";
}

/** Maps a missing skill to a free learning resource search link. */
function learnLink(skill: string) {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(
    `learn ${skill} free tutorial`
  )}`;
}

export function MatchBreakdown({ match }: { match: JobMatch }) {
  const offset = CIRCUMFERENCE - (match.score / 100) * CIRCUMFERENCE;
  const color = ringColor(match.score);

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-center sm:gap-6">
        <div className="relative h-32 w-32 shrink-0">
          <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
            <circle
              cx="60"
              cy="60"
              r={RADIUS}
              fill="none"
              stroke="#e5e7eb"
              strokeWidth="10"
            />
            <motion.circle
              cx="60"
              cy="60"
              r={RADIUS}
              fill="none"
              stroke={color}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              initial={{ strokeDashoffset: CIRCUMFERENCE }}
              animate={{ strokeDashoffset: offset }}
              transition={{ duration: 1, ease: "easeOut" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-mono text-3xl font-bold" style={{ color }}>
              {match.score}
            </span>
            <span className="text-xs text-slate-400">/ 100</span>
          </div>
        </div>
        <div>
          <p className="text-xl font-semibold" style={{ color }}>
            {verdictLabel(match.score)}
          </p>
          {match.highlight && (
            <p className="mt-1 max-w-md text-sm text-slate-600">{match.highlight}</p>
          )}
        </div>
      </div>

      {match.matchReasons.length > 0 && (
        <div>
          <h4 className="mb-2 text-sm font-semibold text-slate-700">Why you match</h4>
          <ul className="space-y-2">
            {match.matchReasons.map((reason, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                {reason}
              </li>
            ))}
          </ul>
        </div>
      )}

      {match.missingSkills.length > 0 && (
        <div>
          <h4 className="mb-2 text-sm font-semibold text-slate-700">
            What you&apos;re missing
          </h4>
          <div className="space-y-2">
            {match.missingSkills.map((skill) => (
              <div
                key={skill}
                className="flex items-center justify-between rounded-md border border-amber-100 bg-amber-50/60 px-3 py-2"
              >
                <span className="flex items-center gap-2 text-sm text-amber-800">
                  <Plus className="h-3.5 w-3.5" /> {skill}
                </span>
                <a
                  href={learnLink(skill)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-medium text-primary hover:underline"
                >
                  Learn free →
                </a>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
