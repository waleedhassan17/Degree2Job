"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { JobDetail } from "@/components/jobs/JobDetail";
import { useSavedJobs } from "@/hooks/useSavedJobs";
import { useAppStore } from "@/store";
import type { JobWithMatch } from "@/lib/types";

export default function JobDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { resumeId, savedJobs } = useAppStore();
  const { toggle, markApplied } = useSavedJobs();
  const [job, setJob] = useState<JobWithMatch | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch(`/api/jobs/${params.id}`);
        if (!res.ok) throw new Error("Job not found");
        const { job } = (await res.json()) as { job: JobWithMatch };
        if (active) {
          setJob({ ...job, isSaved: savedJobs.some((s) => s.jobId === job.id) });
        }
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : "Error");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [params.id, savedJobs]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="container flex flex-col items-center py-32 text-center">
        <p className="text-slate-600">{error || "Job not found"}</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push("/jobs")}>
          <ArrowLeft className="h-4 w-4" /> Back to jobs
        </Button>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <Button variant="ghost" size="sm" onClick={() => router.push("/jobs")}>
        <ArrowLeft className="h-4 w-4" /> Back to jobs
      </Button>
      <JobDetail
        job={job}
        resumeId={resumeId}
        onClose={() => router.push("/jobs")}
        onToggleSave={toggle}
        onApply={markApplied}
      />
    </div>
  );
}
