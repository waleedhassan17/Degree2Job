"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { GraduationCap, Menu, X, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/store";
import { cn, initials } from "@/lib/utils";

const LINKS = [
  { href: "/jobs", label: "Find Jobs" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/#how-it-works", label: "How it Works" },
];

function Logo() {
  return (
    <Link
      href="/"
      className="group flex items-center gap-2.5"
      aria-label="Degree2Job home"
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-700 text-white shadow-sm shadow-primary/30 transition-transform group-hover:scale-105">
        <GraduationCap className="h-5 w-5" />
      </span>
      <span className="text-lg font-bold tracking-tight text-slate-900">
        Degree<span className="text-primary">2</span>Job
      </span>
    </Link>
  );
}

export function Navbar() {
  const pathname = usePathname();
  const profile = useAppStore((s) => s.profile);
  const hasHydrated = useAppStore((s) => s.hasHydrated);
  const [open, setOpen] = useState(false);
  const showProfile = hasHydrated && !!profile;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/70 bg-white/80 backdrop-blur-md">
      <nav className="container flex h-16 items-center justify-between">
        <Logo />

        <div className="hidden items-center gap-1 md:flex">
          {LINKS.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "relative rounded-md px-3.5 py-2 text-sm font-medium text-slate-600 transition-colors hover:text-primary",
                  active && "text-primary"
                )}
              >
                {link.label}
                {active && (
                  <span className="absolute inset-x-3.5 -bottom-[1.5px] h-0.5 rounded-full bg-primary" />
                )}
              </Link>
            );
          })}
        </div>

        <div className="hidden items-center gap-3 md:flex">
          {showProfile ? (
            <Link
              href="/profile"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary-50 to-primary-100 text-sm font-semibold text-primary-700 ring-1 ring-primary-100 transition-shadow hover:shadow-sm"
              aria-label="Your profile"
              title={profile.name}
            >
              {initials(profile.name)}
            </Link>
          ) : (
            <Button asChild size="sm" className="shadow-sm shadow-primary/20">
              <Link href="/upload">
                Upload Resume <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          )}
        </div>

        <button
          className="inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-700 transition-colors hover:bg-surface md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
          aria-expanded={open}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-slate-200/70 bg-white md:hidden"
          >
            <div className="container flex flex-col gap-1 py-3">
              {LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "rounded-md px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-surface hover:text-primary",
                    pathname === link.href && "bg-primary-50 text-primary"
                  )}
                >
                  {link.label}
                </Link>
              ))}
              <Button asChild className="mt-2">
                <Link
                  href={showProfile ? "/profile" : "/upload"}
                  onClick={() => setOpen(false)}
                >
                  {showProfile ? "View Profile" : "Upload Resume"}
                </Link>
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
