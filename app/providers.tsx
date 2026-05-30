"use client";

import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { getSessionId } from "@/lib/utils";
import { useAppStore } from "@/store";
import type { ParsedProfile } from "@/lib/types";

function HydrationHandler() {
  const setProfile = useAppStore((s) => s.setProfile);
  const setUserId = useAppStore((s) => s.setUserId);
  const setHasHydrated = useAppStore((s) => s.setHasHydrated);

  React.useEffect(() => {
    const store = useAppStore.getState();
    if (!store.hasHydrated) setHasHydrated(true);

    let cancelled = false;
    const load = async () => {
      try {
        const sessionId = getSessionId();
        const res = await fetch(`/api/me?sessionId=${encodeURIComponent(sessionId)}`);
        if (!res.ok) return;
        const { user } = (await res.json()) as {
          user?: {
            userId: string;
            resumeId: string | null;
            profile: ParsedProfile | null;
          };
        };
        if (cancelled || !user) return;
        setUserId(user.userId);
        if (user.resumeId && user.profile) {
          setProfile(user.resumeId, user.profile);
        }
      } catch {
        // Best-effort hydration only.
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [setHasHydrated, setProfile, setUserId]);

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={client}>
      <HydrationHandler />
      {children}
    </QueryClientProvider>
  );
}
