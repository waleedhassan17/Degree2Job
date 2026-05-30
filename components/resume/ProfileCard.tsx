"use client";

import { GraduationCap, MapPin, Briefcase, Mail } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SkillBadges } from "./SkillBadges";
import { initials, PK_CITIES } from "@/lib/utils";
import type { ParsedProfile, ExperienceLevel } from "@/lib/types";

const LEVELS: ExperienceLevel[] = ["fresher", "junior", "mid", "senior"];
const LEVEL_VARIANT: Record<ExperienceLevel, "success" | "default" | "warning" | "secondary"> = {
  fresher: "success",
  junior: "default",
  mid: "warning",
  senior: "secondary",
};

interface Props {
  profile: ParsedProfile;
  editable?: boolean;
  onChange?: (patch: Partial<ParsedProfile>) => void;
}

export function ProfileCard({ profile, editable = false, onChange }: Props) {
  const removeSkill = (skill: string) =>
    onChange?.({ skills: profile.skills.filter((s) => s !== skill) });
  const addSkill = (skill: string) => {
    const exists = profile.skills.some(
      (s) => s.toLowerCase() === skill.toLowerCase()
    );
    if (!exists) onChange?.({ skills: [...profile.skills, skill] });
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center gap-4 space-y-0">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary text-lg font-semibold text-white">
          {initials(profile.name)}
        </div>
        <div className="min-w-0 flex-1">
          {editable ? (
            <Input
              value={profile.name}
              onChange={(e) => onChange?.({ name: e.target.value })}
              className="h-9 text-base font-semibold"
              aria-label="Full name"
            />
          ) : (
            <CardTitle className="truncate">{profile.name}</CardTitle>
          )}
          {!editable && (
            <p className="mt-0.5 flex items-center gap-1 text-sm text-slate-500">
              <GraduationCap className="h-4 w-4" />
              {profile.degree} · {profile.university}
            </p>
          )}
        </div>
        <Badge variant={LEVEL_VARIANT[profile.experienceLevel]} className="ml-auto capitalize">
          {profile.experienceLevel}
        </Badge>
      </CardHeader>

      <CardContent className="space-y-5">
        {editable ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <GraduationCap className="h-4 w-4 text-slate-400" /> Degree
              </Label>
              <Input
                value={profile.degree}
                onChange={(e) => onChange?.({ degree: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>University</Label>
              <Input
                value={profile.university}
                onChange={(e) => onChange?.({ university: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <Mail className="h-4 w-4 text-slate-400" /> Email
              </Label>
              <Input
                type="email"
                value={profile.email ?? ""}
                onChange={(e) => onChange?.({ email: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Graduation year</Label>
              <Input
                type="number"
                value={profile.graduationYear ?? ""}
                onChange={(e) =>
                  onChange?.({
                    graduationYear: e.target.value
                      ? Number(e.target.value)
                      : undefined,
                  })
                }
              />
            </div>
          </div>
        ) : (
          (profile.email || profile.graduationYear) && (
            <div className="flex flex-wrap gap-4 text-sm text-slate-600">
              {profile.email && (
                <span className="flex items-center gap-1.5">
                  <Mail className="h-4 w-4 text-slate-400" /> {profile.email}
                </span>
              )}
              {profile.graduationYear && (
                <span className="flex items-center gap-1.5">
                  <GraduationCap className="h-4 w-4 text-slate-400" />
                  Class of {profile.graduationYear}
                </span>
              )}
            </div>
          )
        )}

        {editable ? (
          <div className="space-y-1.5">
            <Label>Summary</Label>
            <Textarea
              value={profile.summary}
              onChange={(e) => onChange?.({ summary: e.target.value })}
              placeholder="A short professional summary…"
            />
          </div>
        ) : (
          profile.summary && (
            <p className="text-sm leading-relaxed text-slate-600">{profile.summary}</p>
          )
        )}

        <div className="space-y-2">
          <Label>Skills</Label>
          <SkillBadges
            skills={profile.skills}
            editable={editable}
            onRemove={removeSkill}
            onAdd={addSkill}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5">
              <Briefcase className="h-4 w-4 text-slate-400" /> Preferred role
            </Label>
            {editable ? (
              <Input
                value={profile.preferredRole}
                onChange={(e) => onChange?.({ preferredRole: e.target.value })}
              />
            ) : (
              <p className="text-sm text-slate-700">{profile.preferredRole}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-slate-400" /> Preferred city
            </Label>
            {editable ? (
              <Select
                value={profile.preferredCity}
                onValueChange={(v) => onChange?.({ preferredCity: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select city" />
                </SelectTrigger>
                <SelectContent>
                  {PK_CITIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <p className="text-sm text-slate-700">{profile.preferredCity}</p>
            )}
          </div>
        </div>

        {editable && (
          <div className="space-y-1.5">
            <Label>Experience level</Label>
            <Select
              value={profile.experienceLevel}
              onValueChange={(v) => onChange?.({ experienceLevel: v as ExperienceLevel })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LEVELS.map((l) => (
                  <SelectItem key={l} value={l} className="capitalize">
                    {l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
