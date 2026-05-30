"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, CheckCircle2, Upload, Loader2 } from "lucide-react";
import { UploadDropzone } from "@/components/resume/UploadDropzone";
import { ProfileCard } from "@/components/resume/ProfileCard";
import { Button } from "@/components/ui/button";
import { useResume } from "@/hooks/useResume";
import { useAppStore } from "@/store";

export default function UploadPage() {
  const router = useRouter();
  const { stage, error, upload, reset } = useResume();
  const { profile, updateProfile, hasHydrated } = useAppStore();
  const [replacing, setReplacing] = useState(false);

  const busy =
    stage === "uploading" || stage === "extracting" || stage === "parsing";

  // Show the dropzone for first-time uploads or when the user chooses to
  // replace their current resume.
  const showDropzone = !profile || replacing;

  const handleFile = async (file: File) => {
    const result = await upload(file);
    if (result) setReplacing(false); // success → reveal the saved profile
  };

  const startReplace = () => {
    reset();
    setReplacing(true);
  };

  const cancelReplace = () => {
    reset();
    setReplacing(false);
  };

  return (
    <div className="container max-w-3xl py-12">
      <div className="relative mb-8 overflow-hidden rounded-2xl px-6 py-12 text-center">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&w=2000&q=80')",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950/85 via-slate-900/80 to-primary-900/85" />
        <div className="relative">
          <h1 className="text-3xl font-bold tracking-tight text-white drop-shadow-sm">
            {profile && !replacing ? "Your profile" : "Upload your resume"}
          </h1>
          <p className="mt-2 text-slate-200">
            {profile && !replacing
              ? "Saved to your profile. Edit anything below or upload an updated resume."
              : "We'll read it once and save it to your profile to match you with jobs across Pakistan."}
          </p>
        </div>
      </div>

      {/* Wait for the persisted store before deciding what to show, so we don't
          flash the upload screen over an already-saved profile. */}
      {!hasHydrated ? (
        <div className="flex flex-col items-center gap-3 py-20 text-slate-500">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm">Loading your profile…</p>
        </div>
      ) : (
        <>
          {showDropzone && (
            <div className="space-y-3">
              <UploadDropzone stage={stage} error={error} onFile={handleFile} />
              {replacing && !busy && (
                <button
                  onClick={cancelReplace}
                  className="text-sm text-slate-500 underline-offset-4 hover:text-primary hover:underline"
                >
                  Cancel and keep my current profile
                </button>
              )}
            </div>
          )}

          {profile && !replacing && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 rounded-lg border border-emerald-100 bg-emerald-50/60 px-4 py-3 text-sm text-emerald-700">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                Resume analyzed and saved to your profile. Changes below save
                automatically.
              </div>

              <ProfileCard profile={profile} editable onChange={updateProfile} />

              <div className="flex flex-col gap-3 sm:flex-row">
                <Button
                  onClick={() => router.push("/jobs")}
                  className="flex-1"
                  size="lg"
                >
                  See my matched jobs <ArrowRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={startReplace}
                  className="flex-1"
                >
                  <Upload className="h-4 w-4" /> Upload updated resume
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
