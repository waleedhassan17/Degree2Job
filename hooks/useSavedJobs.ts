"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useAppStore } from "@/store";
import { getSessionId } from "@/lib/utils";
import type { SavedJob, ApplicationStatus, JobWithMatch } from "@/lib/types";

export function useSavedJobs() {
  const qc = useQueryClient();
  const { setSavedJobIds, toggleSaved } = useAppStore();

  const query = useQuery({
    queryKey: ["saved"],
    queryFn: async (): Promise<SavedJob[]> => {
      const sessionId = getSessionId();
      const res = await fetch(`/api/saved?sessionId=${encodeURIComponent(sessionId)}`);
      if (!res.ok) throw new Error("Failed to load saved jobs");
      const { saved } = (await res.json()) as { saved: SavedJob[] };
      return saved;
    },
  });

  // Keep the Zustand id list in sync for fast card lookups.
  useEffect(() => {
    if (query.data) {
      setSavedJobIds(query.data.map((s) => s.jobId));
    }
  }, [query.data, setSavedJobIds]);

  const save = useMutation({
    mutationFn: async (job: JobWithMatch) => {
      const sessionId = getSessionId();
      const res = await fetch("/api/saved", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, jobId: job.id }),
      });
      if (!res.ok) throw new Error("Failed to save");
      return res.json();
    },
    onMutate: (job) => toggleSaved(job.id),
    onSettled: () => qc.invalidateQueries({ queryKey: ["saved"] }),
  });

  const unsave = useMutation({
    mutationFn: async (jobId: string) => {
      const sessionId = getSessionId();
      const res = await fetch("/api/saved", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, jobId }),
      });
      if (!res.ok) throw new Error("Failed to unsave");
      return res.json();
    },
    onMutate: (jobId) => toggleSaved(jobId),
    onSettled: () => qc.invalidateQueries({ queryKey: ["saved"] }),
  });

  const updateStatus = useMutation({
    mutationFn: async ({
      jobId,
      status,
      notes,
    }: {
      jobId: string;
      status: ApplicationStatus;
      notes?: string;
    }) => {
      const sessionId = getSessionId();
      const res = await fetch("/api/saved", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, jobId, status, notes }),
      });
      if (!res.ok) throw new Error("Failed to update");
      return res.json();
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["saved"] }),
  });

  const toggle = (job: JobWithMatch) => {
    if (job.isSaved) unsave.mutate(job.id);
    else save.mutate(job);
  };

  return {
    saved: query.data ?? [],
    isLoading: query.isLoading,
    toggle,
    updateStatus,
  };
}
