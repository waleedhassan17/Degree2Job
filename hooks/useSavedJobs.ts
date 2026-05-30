"use client";

import { useAppStore } from "@/store";
import { getSessionId } from "@/lib/utils";
import type { ApplicationStatus, JobWithMatch } from "@/lib/types";

// Saved jobs live in the persisted Zustand store (localStorage), so the
// tracker works across navigations/reloads and on Vercel without any database.
// We also fire best-effort writes to the API so data syncs to Supabase IF the
// tables exist — but the UI never depends on them.
function syncSave(jobId: string) {
  fetch("/api/saved", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId: getSessionId(), jobId }),
  }).catch(() => {});
}

function syncUnsave(jobId: string) {
  fetch("/api/saved", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId: getSessionId(), jobId }),
  }).catch(() => {});
}

function syncStatus(jobId: string, status: ApplicationStatus) {
  fetch("/api/saved", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId: getSessionId(), jobId, status }),
  }).catch(() => {});
}

export function useSavedJobs() {
  const savedJobs = useAppStore((s) => s.savedJobs);
  const saveJob = useAppStore((s) => s.saveJob);
  const removeSavedJob = useAppStore((s) => s.removeSavedJob);
  const setSavedStatus = useAppStore((s) => s.setSavedStatus);

  const toggle = (job: JobWithMatch) => {
    const isSaved = savedJobs.some((s) => s.jobId === job.id);
    if (isSaved) {
      removeSavedJob(job.id);
      syncUnsave(job.id);
    } else {
      saveJob(job);
      syncSave(job.id);
    }
  };

  const updateStatus = ({
    jobId,
    status,
  }: {
    jobId: string;
    status: ApplicationStatus;
  }) => {
    setSavedStatus(jobId, status);
    syncStatus(jobId, status);
  };

  return { saved: savedJobs, isLoading: false, toggle, updateStatus };
}
