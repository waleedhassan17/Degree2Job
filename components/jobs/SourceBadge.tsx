import { Badge } from "@/components/ui/badge";
import { SOURCE_LABELS } from "@/lib/utils";
import type { JobSource } from "@/lib/types";

const STYLES: Record<JobSource, string> = {
  rozee: "bg-blue-50 text-blue-700",
  mustakbil: "bg-violet-50 text-violet-700",
  nts: "bg-emerald-50 text-emerald-700",
  fpsc: "bg-teal-50 text-teal-700",
  jsearch: "bg-orange-50 text-orange-700",
  remoteok: "bg-slate-100 text-slate-700",
  themuse: "bg-rose-50 text-rose-700",
};

export function SourceBadge({ source }: { source: JobSource }) {
  return (
    <Badge className={STYLES[source]} variant="secondary">
      {SOURCE_LABELS[source]}
    </Badge>
  );
}
