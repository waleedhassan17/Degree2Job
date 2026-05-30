"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAppStore } from "@/store";
import type { JobMatch, FetchJobsResponse } from "@/lib/types";

/**
 * Requests AI match scores for a batch of jobs and merges them into the
 * cached jobs query so cards re-render with their scores.
 */
export function useJobMatch() {
  const { resumeId, profile } = useAppStore();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (jobIds: string[]): Promise<JobMatch[]> => {
      if (!resumeId) throw new Error("No resume uploaded");
      const res = await fetch("/api/jobs/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeId, profile, jobIds }),
      });
      if (!res.ok) throw new Error("Match failed");
      const { matches } = (await res.json()) as { matches: JobMatch[] };
      return matches;
    },
    onSuccess: (matches) => {
      const key = ["jobs", profile?.preferredRole, profile?.preferredCity];
      qc.setQueryData<FetchJobsResponse>(key, (old) => {
        if (!old) return old;
        const byId = new Map(matches.map((m) => [m.jobId, m]));
        return {
          ...old,
          jobs: old.jobs.map((j) =>
            byId.has(j.id) ? { ...j, match: byId.get(j.id) } : j
          ),
        } as FetchJobsResponse & { jobs: (typeof old.jobs[number] & { match?: JobMatch })[] };
      });
    },
  });
}
