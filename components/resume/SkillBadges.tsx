"use client";

import { useState } from "react";
import { X, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Props {
  skills: string[];
  editable?: boolean;
  onRemove?: (skill: string) => void;
  onAdd?: (skill: string) => void;
}

export function SkillBadges({ skills, editable = false, onRemove, onAdd }: Props) {
  const [value, setValue] = useState("");

  const add = () => {
    const skill = value.trim();
    if (!skill) return;
    onAdd?.(skill);
    setValue("");
  };

  return (
    <div className="space-y-2.5">
      {skills.length ? (
        <div className="flex flex-wrap gap-2">
          {skills.map((skill) => (
            <Badge key={skill} variant="secondary" className="gap-1 py-1">
              {skill}
              {editable && onRemove && (
                <button
                  onClick={() => onRemove(skill)}
                  className="ml-0.5 rounded-full hover:text-rose-600"
                  aria-label={`Remove ${skill}`}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </Badge>
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-400">No skills detected.</p>
      )}

      {editable && onAdd && (
        <div className="flex items-center gap-2">
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                add();
              }
            }}
            placeholder="Add a skill and press Enter"
            className="h-9 flex-1 rounded-md border border-border bg-white px-3 text-sm placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
          <button
            type="button"
            onClick={add}
            className="inline-flex h-9 items-center gap-1 rounded-md bg-primary-50 px-3 text-sm font-medium text-primary transition-colors hover:bg-primary-100"
          >
            <Plus className="h-4 w-4" /> Add
          </button>
        </div>
      )}
    </div>
  );
}
