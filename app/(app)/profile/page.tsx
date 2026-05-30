"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Upload, Trash2, User, Loader2 } from "lucide-react";
import { ProfileCard } from "@/components/resume/ProfileCard";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/store";

export default function ProfilePage() {
  const router = useRouter();
  const { profile, updateProfile, clearProfile, hasHydrated } = useAppStore();

  if (!hasHydrated) {
    return (
      <div className="container flex items-center justify-center py-32 text-slate-400">
        <Loader2 className="mr-2 h-5 w-5 animate-spin text-primary" /> Loading…
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="container flex flex-col items-center py-32 text-center">
        <User className="mb-4 h-10 w-10 text-slate-300" />
        <h2 className="text-xl font-semibold">No profile yet</h2>
        <p className="mt-2 max-w-sm text-sm text-slate-500">
          Upload your resume to create your profile and start matching with jobs.
        </p>
        <Button asChild className="mt-6">
          <Link href="/upload">Upload Resume</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container max-w-3xl py-12">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Your profile</h1>
        <Button asChild variant="outline" size="sm">
          <Link href="/upload">
            <Upload className="h-4 w-4" /> Re-upload
          </Link>
        </Button>
      </div>

      <ProfileCard profile={profile} editable onChange={updateProfile} />

      <div className="mt-6 flex items-center justify-between rounded-lg border border-rose-100 bg-rose-50/50 p-4">
        <div>
          <p className="text-sm font-medium text-slate-700">Clear your profile</p>
          <p className="text-xs text-slate-500">
            Removes your resume data from this device.
          </p>
        </div>
        <Button
          variant="destructive"
          size="sm"
          onClick={() => {
            clearProfile();
            router.push("/");
          }}
        >
          <Trash2 className="h-4 w-4" /> Clear
        </Button>
      </div>
    </div>
  );
}
