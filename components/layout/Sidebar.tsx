"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Briefcase, LayoutDashboard, Upload, User } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/jobs", label: "Jobs", icon: Briefcase },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/upload", label: "Upload", icon: Upload },
  { href: "/profile", label: "Profile", icon: User },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden w-16 flex-col items-center gap-1 border-r border-border py-6 lg:flex">
      {ITEMS.map(({ href, label, icon: Icon }) => {
        const active = pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex h-11 w-11 flex-col items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-surface hover:text-primary",
              active && "bg-primary-50 text-primary"
            )}
            aria-label={label}
            title={label}
          >
            <Icon className="h-5 w-5" />
          </Link>
        );
      })}
    </aside>
  );
}
