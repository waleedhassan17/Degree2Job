"use client";

import { useMemo, useEffect, useState } from "react";
import Link from "next/link";
import { LayoutDashboard, Briefcase } from "lucide-react";
import { StatusKanban } from "@/components/dashboard/StatusKanban";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useSavedJobs } from "@/hooks/useSavedJobs";
import { useAppStore } from "@/store";
import type { ApplicationStatus } from "@/lib/types";

export default function DashboardPage() {
  const { saved, isLoading, updateStatus } = useSavedJobs();
  const [mounted, setMounted] = useState(false);
  const hasHydrated = useAppStore((s) => s.hasHydrated);

  useEffect(() => {
    setMounted(true);
  }, []);

  const stats = useMemo(() => {
    const by = (s: ApplicationStatus) => saved.filter((j) => j.status === s).length;
    return {
      total: saved.length,
      applied: by("applied"),
      interview: by("interview"),
      offer: by("offer"),
    };
  }, [saved]);

  // Wait for hydration AND the saved-jobs query before deciding what to show,
  // so we never flash the empty stats/kanban and then collapse to the empty card.
  if (!mounted || !hasHydrated || isLoading) {
    return (
      <div className="container py-8">
        <div className="mb-6 flex items-center gap-2">
          <LayoutDashboard className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Application tracker</h1>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="animate-pulse text-slate-500">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="mb-6 flex items-center gap-2">
        <LayoutDashboard className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold tracking-tight">Application tracker</h1>
      </div>

      {saved.length === 0 ? (
        <div className="relative flex flex-col items-center overflow-hidden rounded-2xl px-6 py-24 text-center">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage:
                "url('https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=2400&q=80')",
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950/85 via-slate-900/80 to-primary-900/90" />
          <div className="relative flex flex-col items-center">
            <Briefcase className="mb-4 h-10 w-10 text-sky-400" />
            <h2 className="text-lg font-semibold text-white">No saved jobs yet</h2>
            <p className="mt-1 max-w-sm text-sm text-slate-300">
              Save jobs from your matched feed and drag them across columns as you progress.
            </p>
            <Button asChild className="mt-6">
              <Link href="/jobs">Browse jobs</Link>
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Tracked", value: stats.total },
              { label: "Applied", value: stats.applied },
              { label: "Interviews", value: stats.interview },
              { label: "Offers", value: stats.offer },
            ].map((s) => (
              <Card key={s.label}>
                <CardContent className="p-4">
                  <p className="font-mono text-2xl font-bold text-slate-900">{s.value}</p>
                  <p className="text-xs text-slate-500">{s.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <StatusKanban
            items={saved}
            onStatusChange={(jobId, status) => updateStatus.mutate({ jobId, status })}
          />
        </>
      )}
    </div>
  );
}
