"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { useAppStore } from "@/store";
import { applyFilters, sortJobs, type SortKey } from "@/lib/matching";
import type { FetchJobsResponse, JobWithMatch } from "@/lib/types";

export function useJobs(sort: SortKey = "match", search = "") {
  const { profile, savedJobs, filters } = useAppStore();

  // A manual search overrides the preferred role for this query, so the
  // scrapers fetch and the relevance filter both target the searched term.
  const term = search.trim();
  const effectiveRole = term || profile?.preferredRole || "";

  const query = useQuery({
    queryKey: ["jobs", effectiveRole, profile?.preferredCity, filters],
    enabled: Boolean(profile),
    queryFn: async (): Promise<FetchJobsResponse> => {
      const searchProfile = profile
        ? { ...profile, preferredRole: effectiveRole }
        : profile;
      const res = await fetch("/api/jobs/fetch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile: searchProfile, filters }),
      });
      if (!res.ok) throw new Error("Failed to fetch jobs");
      return res.json();
    },
  });

  const jobs: JobWithMatch[] = useMemo(() => {
    const savedIds = new Set(savedJobs.map((s) => s.jobId));
    const raw = (query.data?.jobs ?? []).map((j) => ({
      ...j,
      isSaved: savedIds.has(j.id),
    }));
    return sortJobs(applyFilters(raw, filters), sort);
  }, [query.data, savedJobs, filters, sort]);

  return {
    jobs,
    rawCount: query.data?.totalCount ?? 0,
    sourceBreakdown: query.data?.sourceBreakdown ?? [],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    refetch: query.refetch,
  };
}
