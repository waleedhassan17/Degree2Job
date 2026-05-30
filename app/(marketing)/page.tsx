import Link from "next/link";
import {
  Zap,
  Upload,
  Sparkles,
  FileText,
  Search,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const SOURCES = ["RemoteOK", "The Muse", "Rozee.pk", "Mustakbil", "NTS", "FPSC"];

const STEPS = [
  {
    icon: Upload,
    title: "Upload your resume",
    body: "Drop in your PDF or DOCX. We read it once — no long forms, no account required.",
  },
  {
    icon: Sparkles,
    title: "AI reads & matches",
    body: "Claude extracts your skills and scores every job for fit, so the best ones rise to the top.",
  },
  {
    icon: FileText,
    title: "Apply with a cover letter",
    body: "Generate a tailored cover letter for any role in seconds, then track your applications.",
  },
];

const FEATURES = [
  "One feed across Rozee, Mustakbil, government & international jobs",
  "0–100 match score with reasons and skill gaps for every role",
  "AI cover letters tuned to the Pakistani job market",
  "Kanban application tracker — saved, applied, interview, offer",
];

export default function LandingPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        {/* Professional photographic background */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=2400&q=80')",
          }}
        />
        {/* Readability overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/85 via-slate-900/80 to-primary-900/90" />
        <div className="relative container flex flex-col items-center gap-6 py-24 text-center sm:py-32">
          <Badge
            variant="default"
            className="gap-1.5 border border-white/20 bg-white/10 px-3 py-1 text-white backdrop-blur"
          >
            <Zap className="h-3.5 w-3.5" fill="currentColor" /> Built for Pakistani students
          </Badge>
          <h1 className="max-w-3xl text-balance text-4xl font-bold tracking-tight text-white drop-shadow-sm sm:text-6xl">
            Every job in Pakistan, ranked by how well{" "}
            <span className="text-sky-400">you</span> fit.
          </h1>
          <p className="max-w-xl text-balance text-lg text-slate-200">
            Upload your resume once. Degree2Job pulls listings from across the
            country and uses AI to match, score, and help you apply — all in one place.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/upload">
                Upload Resume <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-white/30 bg-white/10 text-white backdrop-blur hover:bg-white/20 hover:text-white"
            >
              <Link href="/jobs">
                <Search className="h-4 w-4" /> Browse Jobs
              </Link>
            </Button>
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            <span className="text-sm text-slate-300">Aggregating from</span>
            {SOURCES.map((s) => (
              <Badge
                key={s}
                variant="outline"
                className="border-white/25 bg-white/5 text-slate-100"
              >
                {s}
              </Badge>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="container py-20">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight">How it works</h2>
          <p className="mt-2 text-slate-600">
            From resume to first application in under five minutes.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <div
              key={step.title}
              className="relative rounded-xl border border-border bg-white p-6"
            >
              <span className="absolute right-5 top-5 font-mono text-3xl font-bold text-slate-100">
                0{i + 1}
              </span>
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-primary-50 text-primary">
                <step.icon className="h-6 w-6" />
              </div>
              <h3 className="mb-1.5 text-lg font-semibold">{step.title}</h3>
              <p className="text-sm leading-relaxed text-slate-600">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-border bg-surface">
        <div className="container grid items-center gap-10 py-20 md:grid-cols-2">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">
              Stop tab-hopping between job boards
            </h2>
            <p className="mt-3 text-slate-600">
              Students lose hours checking the same sites over and over. Degree2Job
              brings everything into one ranked feed and tells you exactly where you stand.
            </p>
            <ul className="mt-6 space-y-3">
              {FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-slate-700">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
                  {f}
                </li>
              ))}
            </ul>
            <Button asChild className="mt-8">
              <Link href="/upload">Get started free</Link>
            </Button>
          </div>
          <div className="rounded-xl border border-border bg-white p-6 shadow-sm">
            <div className="space-y-3">
              {[
                { title: "Frontend Engineer", company: "Systems Ltd", score: 92 },
                { title: "Data Analyst", company: "Careem", score: 78 },
                { title: "Associate SE", company: "10Pearls", score: 64 },
              ].map((j) => (
                <div
                  key={j.title}
                  className="flex items-center justify-between rounded-lg border border-border p-3"
                >
                  <div>
                    <p className="text-sm font-semibold">{j.title}</p>
                    <p className="text-xs text-slate-500">{j.company}</p>
                  </div>
                  <span
                    className={`flex h-10 w-10 items-center justify-center rounded-full font-mono text-sm font-semibold text-white ${
                      j.score >= 80
                        ? "bg-emerald-500"
                        : j.score >= 60
                          ? "bg-amber-500"
                          : "bg-rose-500"
                    }`}
                  >
                    {j.score}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container py-20">
        <div className="relative overflow-hidden rounded-2xl px-8 py-16 text-center text-white">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage:
                "url('https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=2400&q=80')",
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-primary-900/95 via-primary/90 to-primary-700/90" />
          <div className="relative">
            <h2 className="text-3xl font-bold">Your next job is in the feed.</h2>
            <p className="mx-auto mt-2 max-w-md text-primary-100/90">
              Upload your resume and see your matches in minutes. No sign-up required.
            </p>
            <Button asChild size="lg" variant="secondary" className="mt-6">
              <Link href="/upload">
                Upload Resume <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
