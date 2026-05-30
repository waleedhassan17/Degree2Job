"use client";

import { useState, useCallback } from "react";
import { useAppStore } from "@/store";
import { getSessionId } from "@/lib/utils";
import type { ParsedProfile } from "@/lib/types";
import type { UploadStage } from "@/components/resume/UploadDropzone";

export function useResume() {
  const { setProfile, setUserId } = useAppStore();
  const [stage, setStage] = useState<UploadStage>("idle");
  const [error, setError] = useState<string | null>(null);

  const upload = useCallback(
    async (file: File) => {
      setError(null);
      setStage("uploading");
      try {
        const sessionId = getSessionId();

        const form = new FormData();
        form.append("file", file);
        form.append("sessionId", sessionId);

        const uploadRes = await fetch("/api/resume/upload", {
          method: "POST",
          body: form,
        });
        if (!uploadRes.ok) {
          const body = await uploadRes.json().catch(() => ({}));
          throw new Error(body.error || "Upload failed");
        }
        const { rawText } = (await uploadRes.json()) as { rawText: string };

        setStage("extracting");
        // Extraction already happened server-side; brief UX beat.
        await new Promise((r) => setTimeout(r, 250));

        setStage("parsing");
        const parseRes = await fetch("/api/resume/parse", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rawText, sessionId }),
        });
        if (!parseRes.ok) {
          const body = await parseRes.json().catch(() => ({}));
          throw new Error(body.error || "Could not analyze resume");
        }
        const { resumeId, profile, userId } = (await parseRes.json()) as {
          resumeId: string;
          profile: ParsedProfile;
          userId?: string;
        };

        if (userId) setUserId(userId);
        setProfile(resumeId, profile);
        setStage("done");
        return { resumeId, profile };
      } catch (e) {
        setStage("error");
        setError(e instanceof Error ? e.message : "Something went wrong");
        return null;
      }
    },
    [setProfile, setUserId]
  );

  return { stage, error, upload, reset: () => { setStage("idle"); setError(null); } };
}
