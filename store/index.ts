"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { ParsedProfile, FilterState } from "@/lib/types";

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

  // Saved jobs (ids only — full records come from the server)
  savedJobIds: string[];
  setSavedJobIds: (ids: string[]) => void;
  toggleSaved: (jobId: string) => void;
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

      savedJobIds: [],
      setSavedJobIds: (ids) => set({ savedJobIds: ids }),
      toggleSaved: (jobId) =>
        set((s) => ({
          savedJobIds: s.savedJobIds.includes(jobId)
            ? s.savedJobIds.filter((id) => id !== jobId)
            : [...s.savedJobIds, jobId],
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
        savedJobIds: s.savedJobIds,
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
