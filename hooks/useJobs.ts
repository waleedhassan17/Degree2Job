"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { useAppStore } from "@/store";
import { applyFilters, sortJobs, type SortKey } from "@/lib/matching";
import type { FetchJobsResponse, JobWithMatch } from "@/lib/types";

export function useJobs(sort: SortKey = "match") {
  const { profile, savedJobIds, filters } = useAppStore();

  const query = useQuery({
    queryKey: ["jobs", profile?.preferredRole, profile?.preferredCity, filters],
    enabled: Boolean(profile),
    queryFn: async (): Promise<FetchJobsResponse> => {
      const res = await fetch("/api/jobs/fetch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile, filters }),
      });
      if (!res.ok) throw new Error("Failed to fetch jobs");
      return res.json();
    },
  });

  const jobs: JobWithMatch[] = useMemo(() => {
    const raw = (query.data?.jobs ?? []).map((j) => ({
      ...j,
      isSaved: savedJobIds.includes(j.id),
    }));
    return sortJobs(applyFilters(raw, filters), sort);
  }, [query.data, savedJobIds, filters, sort]);

  return {
    jobs,
    rawCount: query.data?.totalCount ?? 0,
    sourceBreakdown: query.data?.sourceBreakdown ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}
