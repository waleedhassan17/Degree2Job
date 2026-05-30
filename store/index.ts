"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  ParsedProfile,
  FilterState,
  SavedJob,
  Job,
  ApplicationStatus,
} from "@/lib/types";

const DEFAULT_FILTERS: FilterState = {
  city: [],
  jobType: [],
  experienceLevel: [],
  source: [],
  postedWithin: "all",
  query: "",
};

interface AppState {
  // Hydration (true once persisted state has been read from localStorage)
  hasHydrated: boolean;
  setHasHydrated: (v: boolean) => void;

  // Anonymous database-backed identity
  userId: string | null;
  setUserId: (userId: string | null) => void;

  // Resume / profile
  resumeId: string | null;
  profile: ParsedProfile | null;
  setProfile: (resumeId: string, profile: ParsedProfile) => void;
  updateProfile: (patch: Partial<ParsedProfile>) => void;
  clearProfile: () => void;

  // Filters
  filters: FilterState;
  setFilters: (patch: Partial<FilterState>) => void;
  resetFilters: () => void;

  // Saved jobs — full records persisted locally so the tracker works
  // across navigations/reloads without a database.
  savedJobs: SavedJob[];
  saveJob: (job: Job) => void;
  removeSavedJob: (jobId: string) => void;
  setSavedStatus: (jobId: string, status: ApplicationStatus) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      hasHydrated: false,
      setHasHydrated: (v) => set({ hasHydrated: v }),

      userId: null,
      setUserId: (userId) => set({ userId }),

      resumeId: null,
      profile: null,
      setProfile: (resumeId, profile) => set({ resumeId, profile }),
      updateProfile: (patch) =>
        set((s) => ({
          profile: s.profile ? { ...s.profile, ...patch } : s.profile,
        })),
      clearProfile: () => set({ resumeId: null, profile: null }),

      filters: DEFAULT_FILTERS,
      setFilters: (patch) =>
        set((s) => ({ filters: { ...s.filters, ...patch } })),
      resetFilters: () => set({ filters: DEFAULT_FILTERS }),

      savedJobs: [],
      saveJob: (job) =>
        set((s) =>
          s.savedJobs.some((x) => x.jobId === job.id)
            ? s
            : {
                savedJobs: [
                  {
                    id: `local-${job.id}`,
                    jobId: job.id,
                    status: "saved",
                    createdAt: new Date().toISOString(),
                    job,
                  },
                  ...s.savedJobs,
                ],
              }
        ),
      removeSavedJob: (jobId) =>
        set((s) => ({ savedJobs: s.savedJobs.filter((x) => x.jobId !== jobId) })),
      setSavedStatus: (jobId, status) =>
        set((s) => ({
          savedJobs: s.savedJobs.map((x) =>
            x.jobId === jobId
              ? {
                  ...x,
                  status,
                  appliedAt:
                    status === "applied"
                      ? x.appliedAt || new Date().toISOString()
                      : x.appliedAt,
                }
              : x
          ),
        })),
    }),
    {
      name: "jobpulse-store",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        userId: s.userId,
        resumeId: s.resumeId,
        profile: s.profile,
        filters: s.filters,
        savedJobs: s.savedJobs,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.setHasHydrated(true);
        }
      },
    }
  )
);

export { DEFAULT_FILTERS };
