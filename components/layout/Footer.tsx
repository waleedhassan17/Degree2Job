import Link from "next/link";
import { GraduationCap, Mail, Github, Linkedin } from "lucide-react";

const COLUMNS = [
  {
    title: "Product",
    links: [
      { href: "/jobs", label: "Find Jobs" },
      { href: "/upload", label: "Upload Resume" },
      { href: "/dashboard", label: "Application Tracker" },
      { href: "/#how-it-works", label: "How it Works" },
    ],
  },
  {
    title: "Job Sources",
    links: [
      { href: "/jobs", label: "Rozee.pk" },
      { href: "/jobs", label: "Mustakbil" },
      { href: "/jobs", label: "Government (NTS, FPSC)" },
      { href: "/jobs", label: "International" },
    ],
  },
];

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-slate-800 bg-slate-950 text-slate-300">
      <div className="container grid gap-10 py-14 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
        {/* Brand */}
        <div className="max-w-xs">
          <Link href="/" className="flex items-center gap-2.5" aria-label="Degree2Job home">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-700 text-white shadow-sm shadow-primary/30">
              <GraduationCap className="h-5 w-5" />
            </span>
            <span className="text-lg font-bold tracking-tight text-white">
              Degree<span className="text-sky-400">2</span>Job
            </span>
          </Link>
          <p className="mt-4 text-sm leading-relaxed text-slate-400">
            AI-matched jobs for Pakistani university students. Upload your resume
            once and see every opportunity, ranked by how well you fit.
          </p>
          <div className="mt-5 flex items-center gap-3">
            {[
              { icon: Mail, href: "mailto:hello@degree2job.pk", label: "Email" },
              { icon: Linkedin, href: "#", label: "LinkedIn" },
              { icon: Github, href: "#", label: "GitHub" },
            ].map(({ icon: Icon, href, label }) => (
              <a
                key={label}
                href={href}
                aria-label={label}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-slate-400 transition-colors hover:border-primary hover:text-white"
              >
                <Icon className="h-4 w-4" />
              </a>
            ))}
          </div>
        </div>

        {/* Link columns */}
        {COLUMNS.map((col) => (
          <div key={col.title}>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-200">
              {col.title}
            </h3>
            <ul className="mt-4 space-y-2.5">
              {col.links.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-slate-400 transition-colors hover:text-white"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}

        {/* CTA column */}
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-200">
            Get started
          </h3>
          <p className="mt-4 text-sm text-slate-400">
            Your next role is one upload away. No sign-up required.
          </p>
          <Link
            href="/upload"
            className="mt-4 inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-primary-600"
          >
            Upload Resume
          </Link>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-slate-800">
        <div className="container flex flex-col items-center justify-between gap-3 py-6 text-sm text-slate-500 sm:flex-row">
          <p>© {year} Degree2Job. Built for Pakistani students.</p>
          <div className="flex items-center gap-5">
            <Link href="#" className="transition-colors hover:text-slate-300">
              Privacy
            </Link>
            <Link href="#" className="transition-colors hover:text-slate-300">
              Terms
            </Link>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              All systems operational
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
