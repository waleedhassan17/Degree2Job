import { cn } from "@/lib/utils";

interface Props {
  score?: number;
  size?: "sm" | "md";
  className?: string;
}

export function MatchScoreBadge({ score, size = "md", className }: Props) {
  const dimension = size === "sm" ? "h-9 w-9 text-xs" : "h-12 w-12 text-sm";

  if (score == null) {
    return (
      <div
        className={cn(
          "flex shrink-0 items-center justify-center rounded-full border border-dashed border-slate-300 font-mono text-slate-400",
          dimension,
          className
        )}
        aria-label="Match score pending"
      >
        —
      </div>
    );
  }

  const color =
    score >= 80
      ? "bg-emerald-500"
      : score >= 60
        ? "bg-amber-500"
        : "bg-rose-500";

  const label =
    score >= 80 ? "Excellent" : score >= 60 ? "Good match" : "Low match";

  return (
    <div
      className={cn(
        "flex shrink-0 flex-col items-center justify-center rounded-full font-mono font-semibold text-white",
        color,
        dimension,
        className
      )}
      role="img"
      aria-label={`Match score ${score} out of 100, ${label}`}
      title={label}
    >
      {score}
    </div>
  );
}
